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

// Tuotekortin "Valitse"-nappi esitäyttää mallin lomakkeeseen
document.querySelectorAll("[data-malli]").forEach((nappi) => {
  nappi.addEventListener("click", () => {
    const valikko = document.getElementById("malli");
    if (valikko) valikko.value = nappi.dataset.malli;
  });
});
