<script lang="ts">
    import faviconDark from '/static/favicon.png';
    import faviconLight from '/static/favicon-light.png';
    import "../app.css";

    let currentFavicon = faviconDark;

    if (typeof window !== 'undefined') {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');

        const updateFavicon = (e: MediaQueryList | MediaQueryListEvent) => {
            currentFavicon = e.matches ? faviconLight : faviconDark;
            const link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
            if (link) link.href = currentFavicon;
        };

        updateFavicon(mediaQuery);
        mediaQuery.addEventListener('change', updateFavicon);
    }
</script>

<svelte:head>
    <link rel="icon" href={currentFavicon} />
</svelte:head>

<a href="/" class="home-btn">
    <button>Home</button>
</a>
<slot />

<style>
.home-btn {
    position: fixed;
    top: 1rem;
    left: 1rem;
    z-index: 100;
    text-decoration: none;
}

.home-btn button {
    padding: .5rem;
    font-size: 1.1rem;
    border-radius: 8px;
    border: 2px solid rgb(180, 190, 214);
    background: linear-gradient(to bottom, #781461, #220443);
    color: #fff;
    cursor: pointer;
    transition: background 0.3s;
}

.home-btn button:hover {
    background: linear-gradient(to bottom, #781461, #9b1c6a);
    font-weight: bold;
}

@media (prefers-color-scheme: light) {
    .home-btn button {
        border: 2px solid rgb(30, 32, 37);
        background: linear-gradient(to bottom, #ed99fd, #e94fd4);
        color: #000000;
    }
    .home-btn button:hover {
        background: linear-gradient(to bottom, #c23cb0, #e94fd4);
        font-weight: bold;
    }
}
</style>
