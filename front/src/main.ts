import './scss/style.scss';
import { Library } from './js/library';

const library = new Library();

library.init();

const formPanel = document.getElementById('tools');
if (formPanel && typeof IntersectionObserver !== 'undefined') {
    const sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.height = '1px';
    formPanel.parentElement?.insertBefore(sentinel, formPanel);

    const observer = new IntersectionObserver(
        ([entry]) => {
            const isSticky =
                entry.boundingClientRect.top < 0 && !entry.isIntersecting;
            formPanel.classList.toggle('is-sticky', isSticky);
        },
        { threshold: [0] }
    );
    observer.observe(sentinel);
}
