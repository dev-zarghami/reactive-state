import Link from "next/link";

export default function Home() {
    return (
        <main className="page-shell home-page">
            <p className="eyebrow">React example</p>
            <h1>
                Reactive queries.<br />Framework lifecycle.
            </h1>
            <p className="description">
                Browse live OMPFinex data through shared, relation-aware queries. Each page
                demonstrates loading, errors, refresh, and scope-driven container cleanup.
            </p>

            <section className="route-grid" aria-label="Example routes">
                <Link className="route-card" href="/pages/currencies">
                    <span className="card-index">01</span>
                    <h2>Currencies</h2>
                    <p>Inspect validated currency DTOs mapped into reactive domain models.</p>
                    <span className="card-link">Open currencies →</span>
                </Link>

                <Link className="route-card" href="/pages/markets">
                    <span className="card-index">02</span>
                    <h2>Markets</h2>
                    <p>Join each market with shared base and quote currency queries.</p>
                    <span className="card-link">Open markets →</span>
                </Link>
            </section>
        </main>
    );
}
