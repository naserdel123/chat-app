/**
 * متحكم الأنميشنات - Animation Controller
 */

class AnimationController {
    constructor() {
        this.observers = new Map();
        this.init();
    }

    init() {
        this.setupIntersectionObserver();
        this.setupParallax();
        this.setupScrollAnimations();
    }

    // Intersection Observer للعناصر المرئية
    setupIntersectionObserver() {
        const options = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if(entry.isIntersecting) {
                    this.animateElement(entry.target);
                    this.observer.unobserve(entry.target);
                }
            });
        }, options);
    }

    observe(element, animation = 'fadeInUp') {
        element.dataset.animation = animation;
        element.style.opacity = '0';
        this.observer.observe(element);
    }

    animateElement(element) {
        const animation = element.dataset.animation || 'fadeInUp';
        const delay = element.dataset.delay || 0;
        const duration = element.dataset.duration || '0.6s';

        element.style.animation = `${animation} ${duration} ease ${delay}s forwards`;
        element.style.opacity = '1';
    }

    // تأثيرات البارالاكس
    setupParallax() {
        document.addEventListener('mousemove', (e) => {
            const parallaxElements = document.querySelectorAll('[data-parallax]');
            
            parallaxElements.forEach(el => {
                const speed = el.dataset.parallax || 0.05;
                const x = (window.innerWidth - e.pageX * 2) * speed;
                const y = (window.innerHeight - e.pageY * 2) * speed;
                
                el.style.transform = `translateX(${x}px) translateY(${y}px)`;
            });
        });
    }

    // تأثيرات التمرير
    setupScrollAnimations() {
        let lastScroll = 0;
        
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;
            const scrollDirection = currentScroll > lastScroll ? 'down' : 'up';
            
            // Navbar effect
            const navbar = document.querySelector('.navbar');
            if(navbar) {
                if(currentScroll > 100) {
                    navbar.classList.add('scrolled');
                } else {
                    navbar.classList.remove('scrolled');
                }
            }

            // Reveal elements
            document.querySelectorAll('[data-reveal]').forEach(el => {
                const rect = el.getBoundingClientRect();
                const isVisible = rect.top < window.innerHeight * 0.85;
                
                if(isVisible) {
                    el.classList.add('revealed');
                }
            });

            lastScroll = currentScroll;
        });
    }

    // تأثير الكتابة التدريجي
    typeWriter(element, text, speed = 50) {
        element.textContent = '';
        let i = 0;
        
        const type = () => {
            if(i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                setTimeout(type, speed);
            }
        };
        
        type();
    }

    // تأثير العد التصاعدي
    countUp(element, target, duration = 2000) {
        const start = 0;
        const increment = target / (duration / 16);
        let current = start;
        
        const updateCount = () => {
            current += increment;
            if(current < target) {
                element.textContent = Math.floor(current);
                requestAnimationFrame(updateCount);
            } else {
                element.textContent = target;
            }
        };
        
        updateCount();
    }

    // تأثير الموجة
    createRipple(x, y, container) {
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(255,255,255,0.3);
            transform: scale(0);
            animation: ripple 0.6s linear;
            pointer-events: none;
            left: ${x}px;
            top: ${y}px;
            width: 20px;
            height: 20px;
            margin-left: -10px;
            margin-top: -10px;
        `;
        
        container.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    }

    // تأثير الاهتزاز
    shake(element, intensity = 5) {
        element.style.animation = 'none';
        element.offsetHeight; // Trigger reflow
        
        const keyframes = [];
        for(let i = 0; i <= 10; i++) {
            const x = (Math.random() - 0.5) * intensity * 2;
            const y = (Math.random() - 0.5) * intensity * 2;
            keyframes.push(`${i * 10}% { transform: translate(${x}px, ${y}px); }`);
        }
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes shake-${Date.now()} {
                ${keyframes.join('\n')}
            }
        `;
        document.head.appendChild(style);
        
        element.style.animation = `shake-${Date.now()} 0.5s ease`;
        setTimeout(() => style.remove(), 500);
    }

    // تأثير اللمعان
    shimmer(element) {
        const shimmer = document.createElement('div');
        shimmer.style.cssText = `
            position: absolute;
            top: 0;
            left: -100%;
            width: 50%;
            height: 100%;
            background: linear-gradient(
                90deg,
                transparent,
                rgba(255,255,255,0.2),
                transparent
            );
            animation: shimmer 1.5s infinite;
        `;
        
        element.style.position = 'relative';
        element.style.overflow = 'hidden';
        element.appendChild(shimmer);
        
        setTimeout(() => shimmer.remove(), 1500);
    }

    // تأثير الانفجار للإيموجي
    explodeEmojis(x, y, emojis = ['✨', '⭐', '🎉']) {
        emojis.forEach((emoji, index) => {
            const el = document.createElement('div');
            el.textContent = emoji;
            el.style.cssText = `
                position: fixed;
                left: ${x}px;
                top: ${y}px;
                font-size: 24px;
                pointer-events: none;
                z-index: 9999;
            `;
            
            document.body.appendChild(el);
            
            const angle = (index / emojis.length) * Math.PI * 2;
            const velocity = 100 + Math.random() * 100;
            const vx = Math.cos(angle) * velocity;
            const vy = Math.sin(angle) * velocity - 100;
            
            let posX = x;
            let posY = y;
            let opacity = 1;
            
            const animate = () => {
                posX += vx * 0.016;
                posY += vy * 0.016 + 5; // الجاذبية
                opacity -= 0.02;
                
                el.style.left = posX + 'px';
                el.style.top = posY + 'px';
                el.style.opacity = opacity;
                
                if(opacity > 0) {
                    requestAnimationFrame(animate);
                } else {
                    el.remove();
                }
            };
            
            requestAnimationFrame(animate);
        });
    }

    // تأثير التلاشي المتسلسل
    staggerFadeIn(elements, delay = 100) {
        elements.forEach((el, index) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                el.style.transition = 'all 0.5s ease';
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, index * delay);
        });
    }

    // تأثير التكبير عند التمرير
    zoomOnScroll(element, scale = 1.2) {
        window.addEventListener('scroll', () => {
            const rect = element.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            const visiblePercent = Math.max(0, Math.min(1, 
                (windowHeight - rect.top) / (windowHeight + rect.height)
            ));
            
            const currentScale = 1 + (visiblePercent * (scale - 1));
            element.style.transform = `scale(${currentScale})`;
        });
    }

    // تأثير الدوران المستمر
    spin(element, speed = 10) {
        element.style.animation = `spin ${speed}s linear infinite`;
    }

    // تأثير العائم
    float(element, amplitude = 10, speed = 3) {
        element.style.animation = `float ${speed}s ease-in-out infinite`;
        element.style.setProperty('--float-amplitude', amplitude + 'px');
    }

    // تأثير النبض
    pulse(element, scale = 1.05) {
        element.style.animation = `pulse 2s ease-in-out infinite`;
    }

    // تأثير الظلال المتحركة
    animatedShadow(element) {
        let angle = 0;
        const animate = () => {
            angle += 0.02;
            const x = Math.sin(angle) * 10;
            const y = Math.cos(angle) * 10;
            element.style.boxShadow = `${x}px ${y}px 30px rgba(0, 212, 170, 0.3)`;
            requestAnimationFrame(animate);
        };
        animate();
    }

    // تأثير التموج للأزرار
    rippleEffect(button) {
        button.addEventListener('click', (e) => {
            const rect = button.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.createRipple(x, y, button);
        });
    }

    // تأثير التحميل
    showLoader(container, type = 'spinner') {
        const loader = document.createElement('div');
        loader.className = `loader loader-${type}`;
        loader.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px;
        `;
        
        if(type === 'spinner') {
            loader.innerHTML = `
                <div style="
                    width: 50px;
                    height: 50px;
                    border: 4px solid rgba(0, 212, 170, 0.3);
                    border-top-color: #00d4aa;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                "></div>
            `;
        } else if(type === 'dots') {
            loader.innerHTML = `
                <div style="display: flex; gap: 8px;">
                    <span style="width: 12px; height: 12px; background: #00d4aa; border-radius: 50%; animation: loadingDots 1.4s infinite ease-in-out both; animation-delay: -0.32s;"></span>
                    <span style="width: 12px; height: 12px; background: #00d4aa; border-radius: 50%; animation: loadingDots 1.4s infinite ease-in-out both; animation-delay: -0.16s;"></span>
                    <span style="width: 12px; height: 12px; background: #00d4aa; border-radius: 50%; animation: loadingDots 1.4s infinite ease-in-out both;"></span>
                </div>
            `;
        }
        
        container.appendChild(loader);
        return loader;
    }

    hideLoader(loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 300);
    }

    // تأثير الانتقال بين الصفحات
    pageTransition(from, to, type = 'slide') {
        return new Promise(resolve => {
            from.style.animation = `${type}Out 0.3s ease forwards`;
            
            setTimeout(() => {
                from.style.display = 'none';
                to.style.display = 'block';
                to.style.animation = `${type}In 0.3s ease forwards`;
                resolve();
            }, 300);
        });
    }

    // تأثير الإشعار المنبثق
    showNotification(options = {}) {
        const {
            title = 'إشعار',
            message = '',
            type = 'info',
            duration = 3000,
            icon = '🔔'
        } = options;

        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(-100px);
            background: ${type === 'success' ? '#00d4aa' : type === 'error' ? '#ff4757' : '#667eea'};
            color: white;
            padding: 20px 30px;
            border-radius: 15px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 15px;
            min-width: 300px;
            opacity: 0;
            transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        `;
        
        notification.innerHTML = `
            <span style="font-size: 24px;">${icon}</span>
            <div>
                <div style="font-weight: 700; margin-bottom: 5px;">${title}</div>
                <div style="font-size: 14px; opacity: 0.9;">${message}</div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(-50%) translateY(0)';
            notification.style.opacity = '1';
        });
        
        // Auto dismiss
        setTimeout(() => {
            notification.style.transform = 'translateX(-50%) translateY(-100px)';
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 500);
        }, duration);
        
        return notification;
    }
}

// Initialize
const anim = new AnimationController();

// Export functions for easy access
window.animate = {
    fadeIn: (el) => anim.animateElement(el, 'fadeIn'),
    fadeInUp: (el) => anim.animateElement(el, 'fadeInUp'),
    shake: (el) => anim.shake(el),
    countUp: (el, target) => anim.countUp(el, target),
    typeWriter: (el, text) => anim.typeWriter(el, text),
    explode: (x, y, emojis) => anim.explodeEmojis(x, y, emojis),
    notify: (options) => anim.showNotification(options),
    loader: (container, type) => anim.showLoader(container, type)
};
