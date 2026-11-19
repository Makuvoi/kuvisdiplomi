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

// ---------- Myrsky-akvarelli liukuvärien tilalla ----------
// Jokainen kohde, joka ennen käytti sinistä/pinkkiä liukuväriä, näyttää
// nyt oman satunnaisen kohtansa kuvasta kuvat/myrsky-1600.jpg. Kuvan
// reunoilla on valkoista paperia, joten kohdat arvotaan reunoista
// sisempää.
const MYRSKY = "kuvat/myrsky-1600.jpg";
const vali = (min, max) => min + Math.random() * (max - min);

document.querySelectorAll(
  ".liukuteksti, .nappi--paa, .nav a[aria-current='page'], .kuvapaikka, .banneri, " +
  ".tuote--suositeltu, .tuote__merkki, .aikajana, .henkilo__kuva, .pallo, .tuote__siru, .tausta, " +
  ".kortti--myrsky, .ukk details, .kortti--kuva"
).forEach((el) => {
  el.style.setProperty("--myrsky-x", `${vali(12, 88).toFixed(1)}%`);
  el.style.setProperty("--myrsky-y", `${vali(12, 88).toFixed(1)}%`);
});

// Akvarellilasikorteille ja pääpainikkeille satunnainen sävynsiirto ja
// kylläisyys, jotta jokainen on selvästi eri värinen. Positiivinen siirto vie
// pinkkiä kohti oranssia ja keltaista, joten sitä suuntaa on vähemmän:
// sävyt vaihtelevat punertavasta pinkistä violetin kautta siniseen.
// Tuotekortit pysyvät oman mallinsa värisinä (style.css).
document.querySelectorAll(".kortti--myrsky, .ukk details, .nappi--paa").forEach((el) => {
  el.style.setProperty("--myrsky-savy", `${vali(-75, 20).toFixed(0)}deg`);
  el.style.setProperty("--myrsky-kyllaisyys", vali(1, 1.6).toFixed(2));
});

// Kuvakorttien tumman pohjan sävy (HSL-sävy): sinisestä magentaan
document.querySelectorAll(".kortti--kuva").forEach((el) => {
  el.style.setProperty("--kuva-savy", vali(228, 300).toFixed(0));
});

// Logon täyte: kuva on 200 × 191 ja logo 64 × 40, joten kuvaa siirretään
// niin, että logon kohdalle osuu satunnainen pala keskialueelta.
document.querySelectorAll(".logo__kuva").forEach((kuva) => {
  kuva.setAttribute("x", (-vali(0.12, 0.88) * (200 - 64)).toFixed(1));
  kuva.setAttribute("y", (-vali(0.12, 0.88) * (191 - 40)).toFixed(1));
});

// ---------- Pisaran kalansilmälinssi ----------
// Pallojen (.pallo, .tuote__siru) sisälle piirretään WebGL-canvas, jossa
// akvarelli näkyy pallomaisen linssin läpi: keskusta suurenee ja reunat
// puristuvat kokoon. Pisara ei pyöri, vaan linssin kohta kiertää kuvassa
// tasaista ympyrärataa, jolloin akvarelli liukuu sulavasti eri suuntiin.
// Jos WebGL ei toimi (tai sivu on avattu suoraan tiedostona, jolloin
// selain estää kuvan käytön), CSS tekee saman ympyräliikkeen ilman
// kalansilmää.
const linssiPallot = [...document.querySelectorAll(".pallo, .tuote__siru")];

if (linssiPallot.length) {
  const vahanLiiketta = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Mallikohtaiset sävyt: kirkkaus, kylläisyys, sävyn kierto (rad)
  const savy = (el) => {
    if (el.classList.contains("tuote__siru--pro")) return [0.55, 2.8, 1.0];
    if (el.classList.contains("tuote__siru--max")) return [1.05, 1.6, 0.2];
    return [1.0, 1.35, 0.0];
  };

  const VARJOSTIN_K = `
    attribute vec2 paikka;
    varying vec2 v;
    void main() { v = paikka; gl_Position = vec4(paikka, 0.0, 1.0); }`;

  const VARJOSTIN_P = `
    precision mediump float;
    varying vec2 v;
    uniform sampler2D kuva;
    uniform vec2 keskus;
    uniform float sade;
    uniform float vahvuus;
    uniform float kulma;
    uniform vec3 saato;

    vec3 saada(vec3 c) {
      c *= saato.x;
      float y = dot(c, vec3(0.299, 0.587, 0.114));
      float i = dot(c, vec3(0.596, -0.274, -0.322));
      float q = dot(c, vec3(0.211, -0.523, 0.312));
      float s = sin(saato.z), k = cos(saato.z);
      vec2 iq = vec2(i * k - q * s, i * s + q * k) * saato.y;
      return vec3(
        y + 0.956 * iq.x + 0.621 * iq.y,
        y - 0.272 * iq.x - 0.647 * iq.y,
        y - 1.106 * iq.x + 1.703 * iq.y);
    }

    vec2 nayte(vec2 p) {
      float s = sin(kulma), k = cos(kulma);
      return keskus + vec2(p.x * k - p.y * s, p.x * s + p.y * k) * sade;
    }

    void main() {
      vec2 p = vec2(v.x, -v.y);
      float r = length(p);
      if (r > 1.0) { gl_FragColor = vec4(0.0); return; }
      // Pallolinssi: etäisyys keskeltä kulkee arkussinin kautta, jolloin
      // keskusta suurenee ja reunat puristuvat.
      float rr = min(r, 0.999);
      vec2 suunta = p / max(r, 1e-4);
      float pallo = asin(rr) / 1.5707963;
      float uusi = mix(pallo, pallo * pallo, vahvuus);
      vec2 q = suunta * uusi;
      // Pieni värien hajonta reunoilla, kuten oikeassa lasissa
      float hajonta = 0.05 * r * r;
      vec3 c = vec3(
        texture2D(kuva, nayte(q * (1.0 + hajonta))).r,
        texture2D(kuva, nayte(q)).g,
        texture2D(kuva, nayte(q * (1.0 - hajonta))).b);
      c = saada(c);
      // Reunan tummuus antaa pallolle syvyyttä
      c *= mix(1.0, 0.55, smoothstep(0.55, 1.0, r));
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`;

  const luoLinssi = (pallo, lahde) => {
    const canvas = document.createElement("canvas");
    canvas.className = "pisara-linssi";
    canvas.setAttribute("aria-hidden", "true");
    const gl = canvas.getContext("webgl", { premultipliedAlpha: false, antialias: false });
    if (!gl) return null;

    const varjostin = (tyyppi, koodi) => {
      const v = gl.createShader(tyyppi);
      gl.shaderSource(v, koodi);
      gl.compileShader(v);
      if (!gl.getShaderParameter(v, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(v));
      return v;
    };
    const ohjelma = gl.createProgram();
    gl.attachShader(ohjelma, varjostin(gl.VERTEX_SHADER, VARJOSTIN_K));
    gl.attachShader(ohjelma, varjostin(gl.FRAGMENT_SHADER, VARJOSTIN_P));
    gl.linkProgram(ohjelma);
    if (!gl.getProgramParameter(ohjelma, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(ohjelma));
    gl.useProgram(ohjelma);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const paikka = gl.getAttribLocation(ohjelma, "paikka");
    gl.enableVertexAttribArray(paikka);
    gl.vertexAttribPointer(paikka, 2, gl.FLOAT, false, 0, 0);

    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, lahde);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const u = (nimi) => gl.getUniformLocation(ohjelma, nimi);
    const [kirkkaus, kyllaisyys, kierto] = savy(pallo);
    gl.uniform3f(u("saato"), kirkkaus, kyllaisyys, kierto);

    // Linssin säde kuvan koordinaateissa (koko kuva = 1). Pienemmissä
    // palloissa näytetään pienempi pala, jotta siveltimenvedot erottuvat.
    const sade = pallo.classList.contains("pallo") ? 0.28 : 0.21;
    gl.uniform1f(u("sade"), sade);

    // Kalansilmän voimakkuus: 0 = pelkkä pallopinta, 1 = keskusta
    // suurenee hyvin voimakkaasti ja reunat puristuvat kokoon.
    const VAHVUUS = 0.49;
    gl.uniform1f(u("vahvuus"), VAHVUUS);

    // Linssi kiertää kuvassa ympyrärataa kuvan keskipisteen ympäri.
    // Radan säde valitaan niin, ettei linssiin osu kuvan reunojen
    // valkoista paperia. Jokaisella pisaralla on oma lähtökohta ja
    // kiertosuunta.
    const MARGINAALI = 0.05;
    const RATA = 0.5 - MARGINAALI - sade;
    const vaihe = vali(0, Math.PI * 2);
    // Nopeus valitaan niin, että kuva liukuu pisaran keskellä noin 0,8
    // pisaran säteen verran sekunnissa pisaran koosta riippumatta.
    // Linssin keskellä yksi pisaran säde vastaa kuvassa matkaa
    // (1 - VAHVUUS) * 2/π * sade (ks. kalansilmän kaava varjostimessa).
    const NOPEUS = 0.8;
    const keskiosa = (1 - VAHVUUS) * (2 / Math.PI) * sade;
    const kulmanopeus = (NOPEUS * keskiosa / RATA) * vali(0.9, 1.1) * (Math.random() < 0.5 ? -1 : 1);

    const koko = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(pallo.clientWidth * dpr));
      if (canvas.width !== w) {
        canvas.width = w;
        canvas.height = w;
        gl.viewport(0, 0, w, w);
      }
    };

    // Pisara ei pyöri: kuvan kulma pysyy samana, vain kohta vaihtuu.
    const piirra = (t) => {
      koko();
      const a = vaihe + t * kulmanopeus;
      gl.uniform2f(u("keskus"), 0.5 + RATA * Math.cos(a), 0.5 + RATA * Math.sin(a));
      gl.uniform1f(u("kulma"), 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    pallo.prepend(canvas);
    pallo.classList.add("linssi-paalla");
    return { pallo, piirra };
  };

  // Odotetaan load-tapahtumaa eikä decode()-lupausta: decode() jää
  // joissain selaimissa odottamaan, kunnes sivu piirretään näkyviin.
  const kuva = new Image();
  const latautunut = new Promise((valmis, virhe) => {
    kuva.onload = valmis;
    kuva.onerror = virhe;
  });
  kuva.src = MYRSKY;
  latautunut.then(() => {
    // WebGL 1 tarvitsee mipmappeja varten kahden potenssin kokoisen
    // tekstuurin, joten kuva skaalataan 1024 × 1024:ään.
    const lahde = document.createElement("canvas");
    lahde.width = lahde.height = 1024;
    lahde.getContext("2d").drawImage(kuva, 0, 0, 1024, 1024);

    const linssit = [];
    for (const pallo of linssiPallot) {
      try {
        const l = luoLinssi(pallo, lahde);
        if (l) linssit.push(l);
      } catch (virhe) {
        console.warn("Pisaran linssi ei käytössä:", virhe);
      }
    }
    if (!linssit.length) return;

    const naytolla = new Set();
    const tarkkailija = new IntersectionObserver((havainnot) => {
      havainnot.forEach((h) => {
        const l = linssit.find((x) => x.pallo === h.target);
        if (h.isIntersecting) naytolla.add(l); else naytolla.delete(l);
      });
    });
    linssit.forEach((l) => tarkkailija.observe(l.pallo));

    // Vahvistuksen siru on piilossa, kunnes lomake lähetetään: piirretään
    // kaikki kerran heti, ja animaatio pyörii vain näkyvissä palloissa.
    linssit.forEach((l) => l.piirra(0));
    if (vahanLiiketta) return;

    const alku = performance.now();
    const kierros = (nyt) => {
      const t = (nyt - alku) / 1000;
      naytolla.forEach((l) => l.piirra(t));
      requestAnimationFrame(kierros);
    };
    requestAnimationFrame(kierros);
  }).catch(() => { /* kuva ei latautunut: CSS-varakeino jää näkyviin */ });
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
      viiva.style.setProperty("--myrsky-x", `${satunnainen(10, 90)}%`);
      viiva.style.setProperty("--myrsky-y", `${satunnainen(10, 90)}%`);
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
