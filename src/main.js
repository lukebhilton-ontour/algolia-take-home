import algoliasearch from "algoliasearch/lite";
import instantsearch from "instantsearch.js";
import {
  searchBox,
  hits,
  refinementList,
  stats,
  pagination,
  configure,
  clearRefinements,
} from "instantsearch.js/es/widgets";

const searchClient = algoliasearch(
  import.meta.env.VITE_ALGOLIA_APP_ID,
  import.meta.env.VITE_ALGOLIA_SEARCH_API_KEY
);

// The dataset's image_url values point at OpenTable's old image CDN, and many
// are now dead links. Broken photos fall back to this inline placeholder
// rather than the browser's default broken-image icon.
const FALLBACK_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 72 72%22%3E%3Crect width=%2272%22 height=%2272%22 rx=%228%22 fill=%22%23e5e7eb%22/%3E%3Ctext x=%2236%22 y=%2244%22 font-size=%2228%22 text-anchor=%22middle%22%3E%F0%9F%8D%BD%EF%B8%8F%3C/text%3E%3C/svg%3E";

// ---------------------------------------------------------------------------
// Modern restaurant search (2026)
// ---------------------------------------------------------------------------

const search = instantsearch({
  indexName: "restaurants",
  searchClient,
  routing: true,
});

search.addWidgets([
  configure({ hitsPerPage: 12 }),

  searchBox({
    container: "#searchbox",
    placeholder: "Search by restaurant, cuisine, or neighborhood…",
    showSubmit: false,
    showReset: true,
  }),

  stats({
    container: "#stats",
    templates: {
      text(data) {
        return `${data.nbHits.toLocaleString()} restaurant${
          data.nbHits === 1 ? "" : "s"
        } found in ${data.processingTimeMS}ms`;
      },
    },
  }),

  refinementList({
    container: "#cuisine-list",
    attribute: "cuisine",
    searchable: true,
    searchablePlaceholder: "Search cuisines…",
    limit: 8,
    showMore: true,
    showMoreLimit: 30,
  }),

  refinementList({
    container: "#price-list",
    attribute: "price_range",
    sortBy: ["name:asc"],
  }),

  refinementList({
    container: "#dining-style-list",
    attribute: "dining_style",
  }),

  clearRefinements({
    container: "#clear-refinements",
    templates: { resetLabel: "Clear filters" },
  }),

  hits({
    container: "#hits",
    templates: {
      item(hit, { html, components }) {
        return html`<article class="hit">
          <img class="hit__image" src="${hit.image_url}" alt="" loading="lazy" />
          <div class="hit__body">
            <h2 class="hit__name">
              ${components.Highlight({ hit, attribute: "name" })}
            </h2>
            <p class="hit__meta">
              ${components.Highlight({ hit, attribute: "cuisine" })} ·
              ${hit.neighborhood}, ${hit.city}
            </p>
            <p class="hit__meta hit__meta--secondary">
              ⭐ ${hit.rating} (${hit.review_count}) · ${hit.price_range} ·
              ${hit.dining_style}
            </p>
          </div>
          <a
            class="hit__cta"
            href="${hit.reserve_url}"
            target="_blank"
            rel="noopener"
          >
            Reserve
          </a>
        </article>`;
      },
      empty(data) {
        return `<p class="no-results">No restaurants found for "${data.query}". Try a different search, or clear a filter.</p>`;
      },
    },
  }),

  pagination({ container: "#pagination" }),
]);

search.start();

// `error` events on <img> don't bubble, but they do fire during the capture
// phase, so a single delegated listener on the container catches every dead
// image link without needing a handler per hit.
document.querySelector("#hits").addEventListener(
  "error",
  (event) => {
    if (event.target.tagName === "IMG") {
      event.target.src = FALLBACK_IMAGE;
    }
  },
  true
);

// ---------------------------------------------------------------------------
// Geo search ("near me")
// ---------------------------------------------------------------------------

const geoToggle = document.querySelector("#geo-toggle");
let geoActive = false;

geoToggle.addEventListener("click", () => {
  if (geoActive) {
    search.helper.setQueryParameter("aroundLatLng", undefined).search();
    geoActive = false;
    geoToggle.classList.remove("geo-toggle--active");
    geoToggle.textContent = "📍 Near me";
    return;
  }

  if (!navigator.geolocation) {
    window.alert("Geolocation isn't supported in this browser.");
    return;
  }

  geoToggle.textContent = "📍 Locating…";
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      search.helper
        .setQueryParameter("aroundLatLng", `${latitude},${longitude}`)
        .search();
      geoActive = true;
      geoToggle.textContent = "📍 Near me ✓";
      geoToggle.classList.add("geo-toggle--active");
    },
    () => {
      window.alert(
        "Couldn't get your location — check your browser's location permissions."
      );
      geoToggle.textContent = "📍 Near me";
    }
  );
});

// ---------------------------------------------------------------------------
// Way Back When Machine (2014 retro mode)
// ---------------------------------------------------------------------------

const modernApp = document.querySelector("#modern-app");
const retroApp = document.querySelector("#retro-app");
const retroToggleButton = document.querySelector("#retro-toggle");
const modernToggleButton = document.querySelector("#modern-toggle");

let retroSearch;

function startRetroSearch() {
  if (retroSearch) return;

  retroSearch = instantsearch({
    indexName: "iconic_2014_moments",
    searchClient,
  });

  retroSearch.addWidgets([
    configure({ hitsPerPage: 10 }),

    searchBox({
      container: "#retro-searchbox",
      placeholder: "search for a game, movie, or gadget from 2014...",
      showSubmit: false,
      showReset: true,
    }),

    refinementList({
      container: "#retro-category-list",
      attribute: "category",
    }),

    stats({
      container: "#retro-stats",
      templates: {
        text(data) {
          return `${data.nbHits} 2014 memor${
            data.nbHits === 1 ? "y" : "ies"
          } found`;
        },
      },
    }),

    hits({
      container: "#retro-hits",
      templates: {
        item(hit, { html, components }) {
          return html`<article class="retro-hit">
            <div class="retro-hit__emoji">${hit.emoji}</div>
            <div class="retro-hit__body">
              <h2 class="retro-hit__name">
                ${components.Highlight({ hit, attribute: "name" })}
              </h2>
              <p class="retro-hit__desc">
                ${components.Highlight({ hit, attribute: "description" })}
              </p>
              <p class="retro-hit__tags">${hit.tags.join(" · ")}</p>
            </div>
          </article>`;
        },
        empty(data) {
          return `<p class="no-results">No 2014 memories found for "${data.query}". Try "Titanfall" or "Interstellar".</p>`;
        },
      },
    }),

    pagination({ container: "#retro-pagination" }),
  ]);

  retroSearch.start();
}

retroToggleButton.addEventListener("click", () => {
  startRetroSearch();
  modernApp.hidden = true;
  retroApp.hidden = false;
  document.body.classList.add("retro-mode");
});

modernToggleButton.addEventListener("click", () => {
  retroApp.hidden = true;
  modernApp.hidden = false;
  document.body.classList.remove("retro-mode");
});
