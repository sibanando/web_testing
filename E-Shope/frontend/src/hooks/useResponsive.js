import { useState, useEffect } from 'react';

const useResponsive = () => {
    const [width, setWidth] = useState(
        typeof window !== 'undefined' ? window.innerWidth : 1280
    );

    useEffect(() => {
        const handleResize = () => setWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return {
        width,
        isMobile: width < 640,       // phones
        isTablet: width >= 640 && width < 1024,  // tablets
        isDesktop: width >= 1024,    // laptops / desktops
    };
};

export default useResponsive;
