const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/apnidunia',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
    max: 10,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 30000,
});

// Thin wrapper — routes use: await db.query(sql, params)
const db = {
    query: (text, params) => pool.query(text, params),
    connect: () => pool.connect(),
};

// ─── Create Tables + Seed ────────────────────────────────────────────────────
const initDb = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id        SERIAL PRIMARY KEY,
            name      TEXT NOT NULL,
            email     TEXT UNIQUE,
            phone     TEXT UNIQUE,
            password  TEXT,
            is_admin  INTEGER DEFAULT 0,
            is_seller INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS products (
            id          SERIAL PRIMARY KEY,
            name        TEXT NOT NULL,
            price       REAL NOT NULL,
            description TEXT,
            category    TEXT DEFAULT 'General',
            images      TEXT DEFAULT '[]',
            rating      REAL DEFAULT 4.2,
            reviews     INTEGER DEFAULT 0,
            discount    INTEGER DEFAULT 0,
            stock       INTEGER DEFAULT 100,
            seller_id   INTEGER,
            created_at  TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS orders (
            id             SERIAL PRIMARY KEY,
            user_id        INTEGER,
            total          REAL NOT NULL,
            status         TEXT DEFAULT 'Pending',
            address        TEXT,
            phone          TEXT,
            payment_method TEXT,
            transaction_id TEXT,
            created_at     TIMESTAMP DEFAULT NOW(),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS order_items (
            id         SERIAL PRIMARY KEY,
            order_id   INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity   INTEGER NOT NULL,
            price      REAL NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        );

        CREATE TABLE IF NOT EXISTS subscribers (
            id         SERIAL PRIMARY KEY,
            email      TEXT NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT NOW()
        );
    `);

    // Add phone column if missing (migration for existing DBs)
    await pool.query(`
        DO $$ BEGIN
            ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;
    `);

    // Add OAuth columns for Google / Microsoft social login
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider TEXT`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_id TEXT`);

    // Add indexes for frequently queried columns
    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_products_category  ON products(category);
        CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);
        CREATE INDEX IF NOT EXISTS idx_orders_user_id     ON orders(user_id);
        CREATE INDEX IF NOT EXISTS idx_order_items_order_id   ON order_items(order_id);
        CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
    `);

    // GIN index for PostgreSQL full-text search on products
    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_products_fts ON products
        USING GIN (to_tsvector('english', name || ' ' || COALESCE(description,'') || ' ' || category));
    `);

    // ─── Feature tables (additive migrations) ────────────────────────────────

    // Event tracking & analytics
    await pool.query(`
        CREATE TABLE IF NOT EXISTS user_events (
            id           SERIAL PRIMARY KEY,
            user_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
            session_id   TEXT,
            event_type   TEXT NOT NULL,
            product_id   INTEGER REFERENCES products(id) ON DELETE SET NULL,
            search_query TEXT,
            ip           TEXT,
            country      TEXT,
            city         TEXT,
            device       TEXT,
            created_at   TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_user_events_user    ON user_events(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_events_product ON user_events(product_id);
        CREATE INDEX IF NOT EXISTS idx_user_events_type    ON user_events(event_type);
        CREATE INDEX IF NOT EXISTS idx_user_events_created ON user_events(created_at);
    `);

    // Returns & refunds
    await pool.query(`
        CREATE TABLE IF NOT EXISTS return_requests (
            id            SERIAL PRIMARY KEY,
            order_id      INTEGER NOT NULL REFERENCES orders(id),
            user_id       INTEGER NOT NULL REFERENCES users(id),
            reason        TEXT NOT NULL,
            status        TEXT DEFAULT 'requested',
            refund_amount REAL,
            admin_note    TEXT,
            created_at    TIMESTAMP DEFAULT NOW(),
            updated_at    TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_returns_order ON return_requests(order_id);
        CREATE INDEX IF NOT EXISTS idx_returns_user  ON return_requests(user_id);
    `);

    // Delivery agents
    await pool.query(`
        CREATE TABLE IF NOT EXISTS delivery_agents (
            id          SERIAL PRIMARY KEY,
            name        TEXT NOT NULL,
            phone       TEXT UNIQUE NOT NULL,
            email       TEXT UNIQUE,
            password    TEXT NOT NULL,
            is_active   INTEGER DEFAULT 1,
            current_lat REAL,
            current_lng REAL,
            last_seen   TIMESTAMP,
            created_at  TIMESTAMP DEFAULT NOW()
        );
    `);

    // Deliveries (order → agent assignments) — Flipkart/Amazon style
    await pool.query(`
        CREATE TABLE IF NOT EXISTS deliveries (
            id                  SERIAL PRIMARY KEY,
            order_id            INTEGER UNIQUE REFERENCES orders(id),
            agent_id            INTEGER REFERENCES delivery_agents(id),
            status              TEXT DEFAULT 'assigned',
            tracking_token      TEXT UNIQUE NOT NULL,
            agent_lat           REAL,
            agent_lng           REAL,
            estimated_delivery  TIMESTAMP,
            delivery_attempts   INTEGER DEFAULT 0,
            max_attempts        INTEGER DEFAULT 3,
            failed_reason       TEXT,
            delivery_otp        TEXT,
            otp_verified        INTEGER DEFAULT 0,
            delivery_notes      TEXT,
            assigned_at         TIMESTAMP DEFAULT NOW(),
            delivered_at        TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_deliveries_token ON deliveries(tracking_token);
        CREATE INDEX IF NOT EXISTS idx_deliveries_agent ON deliveries(agent_id);
    `);
    // Add new columns to existing deployments
    await pool.query(`ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMP`);
    await pool.query(`ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS delivery_attempts   INTEGER DEFAULT 0`);
    await pool.query(`ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS max_attempts        INTEGER DEFAULT 3`);
    await pool.query(`ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS failed_reason       TEXT`);
    await pool.query(`ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS delivery_otp        TEXT`);
    await pool.query(`ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS otp_verified        INTEGER DEFAULT 0`);
    await pool.query(`ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS delivery_notes      TEXT`);

    // ─── CRM tables ───────────────────────────────────────────────────────────

    // Wishlists
    await pool.query(`
        CREATE TABLE IF NOT EXISTS wishlists (
            id         SERIAL PRIMARY KEY,
            user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(user_id, product_id)
        );
        CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id);
    `);

    // Product reviews
    await pool.query(`
        CREATE TABLE IF NOT EXISTS product_reviews (
            id                SERIAL PRIMARY KEY,
            product_id        INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            rating            INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
            title             TEXT,
            body              TEXT,
            is_verified_buyer INTEGER DEFAULT 0,
            is_approved       INTEGER DEFAULT 1,
            created_at        TIMESTAMP DEFAULT NOW(),
            UNIQUE(product_id, user_id)
        );
        CREATE INDEX IF NOT EXISTS idx_reviews_product ON product_reviews(product_id);
        CREATE INDEX IF NOT EXISTS idx_reviews_user    ON product_reviews(user_id);
    `);

    // Support tickets
    await pool.query(`
        CREATE TABLE IF NOT EXISTS support_tickets (
            id         SERIAL PRIMARY KEY,
            user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            order_id   INTEGER REFERENCES orders(id) ON DELETE SET NULL,
            subject    TEXT NOT NULL,
            category   TEXT DEFAULT 'general',
            status     TEXT DEFAULT 'open',
            priority   TEXT DEFAULT 'medium',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_tickets_user   ON support_tickets(user_id);
        CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);
    `);

    // Ticket messages
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ticket_messages (
            id         SERIAL PRIMARY KEY,
            ticket_id  INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
            sender_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            is_admin   INTEGER DEFAULT 0,
            body       TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);
    `);

    // Notifications
    await pool.query(`
        CREATE TABLE IF NOT EXISTS notifications (
            id         SERIAL PRIMARY KEY,
            user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type       TEXT NOT NULL,
            title      TEXT NOT NULL,
            body       TEXT,
            link       TEXT,
            is_read    INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_notifications_user   ON notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);
    `);

    // Loyalty points ledger
    await pool.query(`
        CREATE TABLE IF NOT EXISTS loyalty_ledger (
            id           SERIAL PRIMARY KEY,
            user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            points       INTEGER NOT NULL,
            type         TEXT NOT NULL,
            reference_id INTEGER,
            note         TEXT,
            created_at   TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_loyalty_user ON loyalty_ledger(user_id);
    `);

    // Ensure order_items cascade on order delete (idempotent via constraint name check)
    await pool.query(`
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_name = 'order_items_order_id_cascade'
            ) THEN
                ALTER TABLE order_items
                    DROP CONSTRAINT IF EXISTS order_items_order_id_fkey,
                    ADD CONSTRAINT order_items_order_id_cascade
                        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
            END IF;
        END $$;
    `);

    // ─── Seed Products ────────────────────────────────────────────────────────
    const { rows: [{ cnt }] } = await pool.query('SELECT COUNT(*) as cnt FROM products');
    if (parseInt(cnt) === 0) {
        const seedProducts = [
            { name: 'Wireless Bluetooth Earbuds - Active Noise Cancellation', price: 1299, description: 'Premium sound quality with 30hr battery life, IPX5 waterproof', category: 'Electronics', images: JSON.stringify(['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop']), rating: 4.5, reviews: 12840, discount: 45, stock: 250 },
            { name: 'Slim Fit Cotton Casual Shirt for Men', price: 499, description: '100% pure cotton, available in multiple colors, machine washable', category: 'Fashion', images: JSON.stringify(['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop']), rating: 4.2, reviews: 5620, discount: 60, stock: 500 },
            { name: 'Samsung 43-inch 4K Ultra HD Smart LED TV', price: 28999, description: 'Crystal 4K processor, HDR10+, built-in Alexa, 3 HDMI ports', category: 'Electronics', images: JSON.stringify(['https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&h=400&fit=crop']), rating: 4.4, reviews: 8920, discount: 30, stock: 80 },
            { name: 'Women Anarkali Kurta Set - Ethnic Wear', price: 899, description: 'Beautiful embroidered kurta with palazzo pants, festival special', category: 'Fashion', images: JSON.stringify(['https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&h=400&fit=crop']), rating: 4.3, reviews: 3210, discount: 50, stock: 180 },
            { name: 'Apple iPhone 15 (128GB) - Black', price: 69999, description: 'A16 Bionic chip, 48MP camera, Dynamic Island, USB-C, iOS 17', category: 'Mobiles', images: JSON.stringify(['https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=400&h=400&fit=crop']), rating: 4.7, reviews: 45200, discount: 10, stock: 60 },
            { name: 'Non-Stick Cookware Set 5-Piece Kitchen', price: 1599, description: 'Hard anodized aluminium, PFOA free coating, induction compatible', category: 'Home', images: JSON.stringify(['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop']), rating: 4.1, reviews: 7830, discount: 55, stock: 120 },
            { name: 'Nike Air Max 270 Running Shoes', price: 3499, description: 'Max Air unit for all-day comfort, mesh upper for breathability', category: 'Sports', images: JSON.stringify(['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop']), rating: 4.5, reviews: 9150, discount: 35, stock: 200 },
            { name: 'boAt Rockerz 450 Bluetooth Headphone', price: 999, description: '15hr playback, 40mm drivers, foldable design, built-in mic', category: 'Electronics', images: JSON.stringify(['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop']), rating: 4.3, reviews: 28640, discount: 50, stock: 340 },
            { name: 'Prestige Iris 750W Mixer Grinder', price: 2199, description: '3 stainless steel jars, 5-speed control, 2 year warranty', category: 'Appliances', images: JSON.stringify(['https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400&h=400&fit=crop']), rating: 4.2, reviews: 14500, discount: 40, stock: 150 },
            { name: 'Fossil Gen 6 Smartwatch 44mm', price: 12999, description: 'Wear OS, heart rate monitor, GPS, 1-day battery, IP68', category: 'Electronics', images: JSON.stringify(['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop']), rating: 4.4, reviews: 6320, discount: 38, stock: 90 },
            { name: 'Wildcraft Laptop Backpack 35L', price: 1299, description: 'Water resistant, padded laptop compartment, USB charging port', category: 'Fashion', images: JSON.stringify(['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop']), rating: 4.3, reviews: 11200, discount: 42, stock: 220 },
            { name: 'Wooden Study Table with Drawer', price: 4999, description: 'Solid sheesham wood, anti-scratch surface, easy assembly', category: 'Home', images: JSON.stringify(['https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400&h=400&fit=crop']), rating: 4.0, reviews: 2180, discount: 25, stock: 45 },
            { name: 'Realme Narzo 60 5G (8GB+128GB)', price: 14999, description: 'Dimensity 6020, 64MP camera, 5000mAh, 33W fast charging', category: 'Mobiles', images: JSON.stringify(['https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=400&h=400&fit=crop']), rating: 4.2, reviews: 19800, discount: 20, stock: 130 },
            { name: 'YOGA MAT Anti-Slip 6mm Exercise Mat', price: 599, description: 'Eco-friendly TPE material, carrying strap included, 183x61cm', category: 'Sports', images: JSON.stringify(['https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=400&fit=crop']), rating: 4.4, reviews: 8900, discount: 65, stock: 400 },
            { name: 'Lakme Absolute Matte Lipstick Combo', price: 349, description: 'Pack of 4 shades, long-lasting 8 hrs, vitamin E enriched', category: 'Beauty', images: JSON.stringify(['https://images.unsplash.com/photo-1631214524020-3c69f87cd1cd?w=400&h=400&fit=crop']), rating: 4.1, reviews: 22100, discount: 30, stock: 600 },
            { name: 'Tata Sampann Unpolished Dal Combo Pack', price: 399, description: '4 types of dal, 1kg each, rich in protein, farm fresh', category: 'Grocery', images: JSON.stringify(['https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop']), rating: 4.3, reviews: 15600, discount: 20, stock: 800 },
            { name: 'Organic Cold Pressed Coconut Oil 1L', price: 299, description: '100% pure virgin coconut oil, chemical free, wood pressed', category: 'Grocery', images: JSON.stringify(['https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=400&fit=crop']), rating: 4.5, reviews: 9200, discount: 15, stock: 500 },
            { name: 'Tanishq Gold Plated Necklace Set', price: 2499, description: 'Traditional design, anti-tarnish coating, adjustable length', category: 'Jewellery', images: JSON.stringify(['https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&h=400&fit=crop']), rating: 4.6, reviews: 4300, discount: 25, stock: 70 },
            { name: 'Silver Oxidized Jhumka Earrings Set', price: 449, description: 'Handcrafted, lightweight, perfect for daily & festive wear', category: 'Jewellery', images: JSON.stringify(['https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&h=400&fit=crop']), rating: 4.4, reviews: 7800, discount: 40, stock: 300 },
            { name: 'Safari Trolley Bag 65cm - Hardcase', price: 2999, description: '4 wheel spinner, TSA lock, expandable, scratch resistant', category: 'Travel', images: JSON.stringify(['https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=400&h=400&fit=crop']), rating: 4.3, reviews: 11400, discount: 50, stock: 150 },
            { name: 'Neck Pillow & Eye Mask Travel Kit', price: 599, description: 'Memory foam pillow, silk eye mask, earplugs, carry pouch', category: 'Travel', images: JSON.stringify(['https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=400&fit=crop']), rating: 4.2, reviews: 5600, discount: 35, stock: 250 },
        ];
        for (const p of seedProducts) {
            await pool.query(
                `INSERT INTO products (name, price, description, category, images, rating, reviews, discount, stock)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
                [p.name, p.price, p.description, p.category, p.images, p.rating, p.reviews, p.discount, p.stock]
            );
        }
        console.log(`✓ Database seeded with ${seedProducts.length} products`);
    }

    // ─── Seed Demo User ───────────────────────────────────────────────────────
    const { rows: [demoUser] } = await pool.query("SELECT id FROM users WHERE email = 'user@example.com'");
    if (!demoUser) {
        const hash = bcrypt.hashSync('password123', 10);
        await pool.query('INSERT INTO users (name, email, password, is_admin) VALUES ($1,$2,$3,0)', ['Demo User', 'user@example.com', hash]);
        console.log('✓ Demo user: user@example.com / password123');
    }

    // ─── Seed Admin ───────────────────────────────────────────────────────────
    const { rows: [adminUser] } = await pool.query("SELECT id FROM users WHERE name = 'sibanando'");
    if (!adminUser) {
        const hash = bcrypt.hashSync('Sib@1984', 10);
        await pool.query('INSERT INTO users (name, email, password, is_admin) VALUES ($1,$2,$3,1)', ['sibanando', 'sibanando@apnidunia.com', hash]);
        console.log('✓ Admin: sibanando / Sib@1984');
    } else {
        await pool.query("UPDATE users SET is_admin = 1 WHERE name = 'sibanando'");
    }

    // ─── Seed Demo Seller ─────────────────────────────────────────────────────
    const { rows: [sellerUser] } = await pool.query("SELECT id FROM users WHERE email = 'seller@apnidunia.com'");
    if (!sellerUser) {
        const hash = bcrypt.hashSync('seller123', 10);
        await pool.query('INSERT INTO users (name, email, password, is_seller) VALUES ($1,$2,$3,1)', ['Demo Seller', 'seller@apnidunia.com', hash]);
        console.log('✓ Seller: seller@apnidunia.com / seller123');
    }

    // ─── Seed Demo Delivery Agent ─────────────────────────────────────────────
    const { rows: [demoAgent] } = await pool.query("SELECT id FROM delivery_agents WHERE phone = '9876543210'");
    if (!demoAgent) {
        const hash = bcrypt.hashSync('agent123', 10);
        await pool.query(
            'INSERT INTO delivery_agents (name, phone, email, password) VALUES ($1,$2,$3,$4)',
            ['Demo Agent', '9876543210', 'agent@apnidunia.com', hash]
        );
        console.log('✓ Delivery agent: phone 9876543210 / agent123  →  /agent');
    }

    console.log('✓ PostgreSQL ready');
};

module.exports = db;
module.exports.initDb = initDb;
module.exports.pool = pool;
