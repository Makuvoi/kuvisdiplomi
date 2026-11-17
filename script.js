// Pilvi – pieni yhteinen skripti (ei backendiä)

// Parallaksitausta: kuva liukuu ylöspäin hitaammin kuin sivun sisältö.
// Sivun alussa näkyy kuvan yläosa (tähtitaivas), lopussa alaosa (siluetti).
const tausta = document.querySelector(".tausta");

if (tausta && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  let odottaa = false;

  const paivitaTausta = () => {
    const vieritettava = document.documentElement.scrollHeight - window.innerHeight;
    const edistys = vieritettava > 0 ? Math.min(1, Math.max(0, window.scrollY / vieritettava)) : 0;
    const liikevara = tausta.offsetHeight - window.innerHeight;
    tausta.style.transform = `translate3d(0, ${-edistys * liikevara}px, 0)`;
    odottaa = false;
  };

  window.addEventListener("scroll", () => {
    if (!odottaa) {
      odottaa = true;
      requestAnimationFrame(paivitaTausta);
    }
  }, { passive: true });

  window.addEventListener("resize", paivitaTausta);
  paivitaTausta();
}

// Osiot ilmestyvät pehmeästi, kun ne vieritetään näkyviin
const ilmestyvat = document.querySelectorAll(".ilmesty");

if ("IntersectionObserver" in window) {
  const tarkkailija = new IntersectionObserver((havainnot) => {
    havainnot.forEach((h) => {
      if (h.isIntersecting) {
        h.target.classList.add("nakyvissa");
        tarkkailija.unobserve(h.target);
      }
    });
  }, { threshold: 0.12 });

  ilmestyvat.forEach((el) => tarkkailija.observe(el));
} else {
  ilmestyvat.forEach((el) => el.classList.add("nakyvissa"));
}

// Varauslomake: ei lähetä mitään minnekään, näyttää vain vahvistuksen
const lomake = document.getElementById("varauslomake");

if (lomake) {
  lomake.addEventListener("submit", (e) => {
    e.preventDefault();
    lomake.hidden = true;
    const vahvistus = document.getElementById("vahvistus");
    vahvistus.classList.add("nakyy");
    vahvistus.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

// Satunnaiset glitch-efektit: aika ajoin yksi ruudulla näkyvä kohde
// välähtää hetken, ja välähdykset tihenevät ajan myötä. Tyylit ovat
// style.css:ssä. Efektit jäävät pois, jos käyttäjä on pyytänyt
// käyttöjärjestelmästä vähemmän liikettä.
if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const satunnainen = (min, max) => min + Math.random() * (max - min);
  const arvo = (lista) => lista[Math.floor(Math.random() * lista.length)];

  const nakyvissa = (el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
  };

  // Lisää luokan hetkeksi; poistaa ja lisää uudelleen, jotta animaatio
  // käynnistyy alusta, vaikka sama kohde arvottaisiin kahdesti peräkkäin.
  const valahda = (el, luokka, kesto) => {
    el.classList.remove(luokka);
    void el.offsetWidth;
    el.classList.add(luokka);
    setTimeout(() => el.classList.remove(luokka), kesto);
  };

  const efektit = [
    // [paino, funktio]: suurempi paino = yleisempi efekti
    [5, () => {
      const kohteet = [...document.querySelectorAll("h1, h2, h3, .logo")].filter(nakyvissa);
      if (!kohteet.length) return false;
      valahda(arvo(kohteet), "glitch-teksti", 340);
    }],
    [3, () => {
      const kohteet = [...document.querySelectorAll(".kortti--kuva")].filter(nakyvissa);
      if (!kohteet.length) return false;
      valahda(arvo(kohteet), "glitch-kuva", 300);
    }],
    [2, () => {
      const roiske = document.querySelector(".roiske");
      if (!roiske || !nakyvissa(roiske)) return false;
      valahda(roiske, "glitch-roiske", 320);
    }],
    [2, () => {
      const viiva = document.createElement("div");
      viiva.className = "glitch-viiva";
      viiva.style.top = `${satunnainen(10, 90)}vh`;
      viiva.style.height = `${Math.round(satunnainen(2, 7))}px`;
      document.body.appendChild(viiva);
      setTimeout(() => viiva.remove(), 250);
    }],
  ];

  const arvoEfekti = () => {
    const yhteensa = efektit.reduce((s, [paino]) => s + paino, 0);
    let luku = Math.random() * yhteensa;
    for (const [paino, efekti] of efektit) {
      luku -= paino;
      if (luku < 0) return efekti;
    }
    return efektit[0][1];
  };

  // Efektit yleistyvät sitä mukaa, mitä pidempään sivu on auki.
  // Alussa väli on keskimäärin noin 25 s, ja se lyhenee viidessä
  // minuutissa noin 2,5 sekuntiin. Neliöllinen käyrä pitää alun
  // pitkään rauhallisena ja tihentää efektejä vasta myöhemmin.
  const ALKUVALI = 25000;
  const LOPPUVALI = 2500;
  const TIHENTYMISAIKA = 5 * 60 * 1000;

  const valiNyt = () => {
    const edistys = Math.min(1, performance.now() / TIHENTYMISAIKA);
    const keskiarvo = LOPPUVALI + (ALKUVALI - LOPPUVALI) * (1 - edistys) ** 2;
    return keskiarvo * satunnainen(0.6, 1.4);
  };

  const seuraava = () => {
    setTimeout(() => {
      // Ei efektejä taustalla olevassa välilehdessä
      if (!document.hidden) {
        // Jos arvottua kohdetta ei ole ruudulla, kokeillaan muutamaa muuta
        for (let yritys = 0; yritys < 4; yritys++) {
          if (arvoEfekti()() !== false) break;
        }
      }
      seuraava();
    }, valiNyt());
  };

  seuraava();
}

// Tuotekortin "Valitse"-nappi esitäyttää mallin lomakkeeseen
document.querySelectorAll("[data-malli]").forEach((nappi) => {
  nappi.addEventListener("click", () => {
    const valikko = document.getElementById("malli");
    if (valikko) valikko.value = nappi.dataset.malli;
  });
});
