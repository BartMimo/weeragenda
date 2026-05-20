export default function Features() {
  return (
    <section className="features">
      <div className="feature">
        <div className="ico">— Geen app</div>
        <h3>Native in jouw agenda</h3>
        <p>
          Het weer verschijnt als blokken van 2 uur naast je vergaderingen.
          Geen extra icoon op je startscherm.
        </p>
      </div>
      <div className="feature">
        <div className="ico">— Live data</div>
        <h3>Open-Meteo, ieder uur</h3>
        <p>
          Bron is het gratis Open-Meteo netwerk van Europese meteorologische
          diensten. Jouw agenda haalt de feed automatisch op.
        </p>
      </div>
      <div className="feature">
        <div className="ico">— Privé</div>
        <h3>Geen account. Geen tracker.</h3>
        <p>
          We slaan je locatie niet op. De feed is een statische URL die je
          zelf bewaart of weggooit.
        </p>
      </div>
    </section>
  );
}
