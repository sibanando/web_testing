--
-- PostgreSQL database dump
--

\restrict 4FxSpJadxa6sATocXCcz2pGSmBswma5G9f1AkhvTHMv8RXNyxd1nYuOHlmfXzfO

-- Dumped from database version 16.12
-- Dumped by pg_dump version 16.12

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE IF EXISTS ONLY public.products DROP CONSTRAINT IF EXISTS products_pkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_pkey;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_pkey;
ALTER TABLE IF EXISTS public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.products ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.orders ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.order_items ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.users_id_seq;
DROP TABLE IF EXISTS public.users;
DROP SEQUENCE IF EXISTS public.products_id_seq;
DROP TABLE IF EXISTS public.products;
DROP SEQUENCE IF EXISTS public.orders_id_seq;
DROP TABLE IF EXISTS public.orders;
DROP SEQUENCE IF EXISTS public.order_items_id_seq;
DROP TABLE IF EXISTS public.order_items;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    order_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity integer NOT NULL,
    price real NOT NULL
);


--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    user_id integer,
    total real NOT NULL,
    status text DEFAULT 'Pending'::text,
    address text,
    phone text,
    payment_method text,
    transaction_id text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id integer NOT NULL,
    name text NOT NULL,
    price real NOT NULL,
    description text,
    category text DEFAULT 'General'::text,
    images text DEFAULT '[]'::text,
    rating real DEFAULT 4.2,
    reviews integer DEFAULT 0,
    discount integer DEFAULT 0,
    stock integer DEFAULT 100,
    seller_id integer,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    is_admin integer DEFAULT 0,
    is_seller integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_items (id, order_id, product_id, quantity, price) FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, user_id, total, status, address, phone, payment_method, transaction_id, created_at) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (id, name, price, description, category, images, rating, reviews, discount, stock, seller_id, created_at) FROM stdin;
1	Wireless Bluetooth Earbuds - Active Noise Cancellation	1299	Premium sound quality with 30hr battery life, IPX5 waterproof	Electronics	["https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop"]	4.5	12840	45	250	\N	2026-03-19 08:04:20.720703
2	Slim Fit Cotton Casual Shirt for Men	499	100% pure cotton, available in multiple colors, machine washable	Fashion	["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop"]	4.2	5620	60	500	\N	2026-03-19 08:04:20.77424
3	Samsung 43-inch 4K Ultra HD Smart LED TV	28999	Crystal 4K processor, HDR10+, built-in Alexa, 3 HDMI ports	Electronics	["https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&h=400&fit=crop"]	4.4	8920	30	80	\N	2026-03-19 08:04:20.786807
4	Women Anarkali Kurta Set - Ethnic Wear	899	Beautiful embroidered kurta with palazzo pants, festival special	Fashion	["https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&h=400&fit=crop"]	4.3	3210	50	180	\N	2026-03-19 08:04:20.808741
5	Apple iPhone 15 (128GB) - Black	69999	A16 Bionic chip, 48MP camera, Dynamic Island, USB-C, iOS 17	Mobiles	["https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=400&h=400&fit=crop"]	4.7	45200	10	60	\N	2026-03-19 08:04:20.84282
6	Non-Stick Cookware Set 5-Piece Kitchen	1599	Hard anodized aluminium, PFOA free coating, induction compatible	Home	["https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop"]	4.1	7830	55	120	\N	2026-03-19 08:04:20.854699
7	Nike Air Max 270 Running Shoes	3499	Max Air unit for all-day comfort, mesh upper for breathability	Sports	["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop"]	4.5	9150	35	200	\N	2026-03-19 08:04:20.86868
8	boAt Rockerz 450 Bluetooth Headphone	999	15hr playback, 40mm drivers, foldable design, built-in mic	Electronics	["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop"]	4.3	28640	50	340	\N	2026-03-19 08:04:20.887535
9	Prestige Iris 750W Mixer Grinder	2199	3 stainless steel jars, 5-speed control, 2 year warranty	Appliances	["https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400&h=400&fit=crop"]	4.2	14500	40	150	\N	2026-03-19 08:04:20.900889
10	Fossil Gen 6 Smartwatch 44mm	12999	Wear OS, heart rate monitor, GPS, 1-day battery, IP68	Electronics	["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop"]	4.4	6320	38	90	\N	2026-03-19 08:04:20.930843
11	Wildcraft Laptop Backpack 35L	1299	Water resistant, padded laptop compartment, USB charging port	Fashion	["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop"]	4.3	11200	42	220	\N	2026-03-19 08:04:20.960351
12	Wooden Study Table with Drawer	4999	Solid sheesham wood, anti-scratch surface, easy assembly	Home	["https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400&h=400&fit=crop"]	4	2180	25	45	\N	2026-03-19 08:04:20.985267
13	Realme Narzo 60 5G (8GB+128GB)	14999	Dimensity 6020, 64MP camera, 5000mAh, 33W fast charging	Mobiles	["https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=400&h=400&fit=crop"]	4.2	19800	20	130	\N	2026-03-19 08:04:20.997473
14	YOGA MAT Anti-Slip 6mm Exercise Mat	599	Eco-friendly TPE material, carrying strap included, 183x61cm	Sports	["https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=400&fit=crop"]	4.4	8900	65	400	\N	2026-03-19 08:04:21.017797
15	Lakme Absolute Matte Lipstick Combo	349	Pack of 4 shades, long-lasting 8 hrs, vitamin E enriched	Beauty	["https://images.unsplash.com/photo-1631214524020-3c69f87cd1cd?w=400&h=400&fit=crop"]	4.1	22100	30	600	\N	2026-03-19 08:04:21.051765
16	Tata Sampann Unpolished Dal Combo Pack	399	4 types of dal, 1kg each, rich in protein, farm fresh	Grocery	["https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop"]	4.3	15600	20	800	\N	2026-03-19 08:04:21.124318
17	Organic Cold Pressed Coconut Oil 1L	299	100% pure virgin coconut oil, chemical free, wood pressed	Grocery	["https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=400&fit=crop"]	4.5	9200	15	500	\N	2026-03-19 08:04:21.191081
18	Tanishq Gold Plated Necklace Set	2499	Traditional design, anti-tarnish coating, adjustable length	Jewellery	["https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&h=400&fit=crop"]	4.6	4300	25	70	\N	2026-03-19 08:04:21.221454
19	Silver Oxidized Jhumka Earrings Set	449	Handcrafted, lightweight, perfect for daily & festive wear	Jewellery	["https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&h=400&fit=crop"]	4.4	7800	40	300	\N	2026-03-19 08:04:21.244922
20	Safari Trolley Bag 65cm - Hardcase	2999	4 wheel spinner, TSA lock, expandable, scratch resistant	Travel	["https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=400&h=400&fit=crop"]	4.3	11400	50	150	\N	2026-03-19 08:04:21.2827
21	Neck Pillow & Eye Mask Travel Kit	599	Memory foam pillow, silk eye mask, earplugs, carry pouch	Travel	["https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=400&fit=crop"]	4.2	5600	35	250	\N	2026-03-19 08:04:21.319704
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, name, email, password, is_admin, is_seller, created_at) FROM stdin;
1	Demo User	user@example.com	$2a$10$q6VQpluBzTvz3KOv7vzjW.heKNm9Y8CLlbUCULIJtTB6T/AzSDaPa	0	0	2026-03-15 03:14:04.3987
3	Demo Seller	seller@apnidunia.com	$2a$10$fWQeTsbEl8mfZ25th7Qkh.f5eWzP3SKXxhZIzDRf03NFA.OljPWV.	0	1	2026-03-15 03:14:05.11525
2	sibanando	sibanando@apnidunia.com	$2a$10$VADLn4w1TAkkJqFmerdm2.ke6emjNGsuqkvc/hk7pqThiPICmGila	1	0	2026-03-15 03:14:04.810967
\.


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.order_items_id_seq', 1, false);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.orders_id_seq', 1, false);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.products_id_seq', 21, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 3, true);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 4FxSpJadxa6sATocXCcz2pGSmBswma5G9f1AkhvTHMv8RXNyxd1nYuOHlmfXzfO

