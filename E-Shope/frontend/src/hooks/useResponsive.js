import { useState, useEffect } from 'react';

const useResponsive = () => {
    const [width, setWidth] = useState(
        typeof window !== 'undefined' ? window.innerWidth : 1280
    );

    useEffect(() => {
        let timer;
        const handleResize = () => {
            clearTimeout(timer);
            timer = setTimeout(() => setWidth(window.innerWidth), 100);
        };
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timer);
        };
    }, []);

    return {
        width,
        isMobile: width < 640,
        isTablet: width >= 640 && width < 1024,
        isDesktop: width >= 1024,
    };
};

export default useResponsive;
