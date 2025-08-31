<script lang="ts">
    import favicon from '/favicon.png';
    import "../app.css";
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
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
</style>