// Pushes both prepared datasets to Algolia and configures their index settings.
//
// Requires ALGOLIA_APP_ID and ALGOLIA_WRITE_API_KEY in a local .env file
// (see .env.example) — the write key is never committed or shipped client-side.

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const algoliasearch = require("algoliasearch");

const { ALGOLIA_APP_ID, ALGOLIA_WRITE_API_KEY } = process.env;

if (!ALGOLIA_APP_ID || !ALGOLIA_WRITE_API_KEY) {
  console.error(
    "Missing ALGOLIA_APP_ID or ALGOLIA_WRITE_API_KEY. Copy .env.example to .env and fill them in."
  );
  process.exit(1);
}

const DATASET_DIR = path.join(__dirname, "..", "dataset");
const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_WRITE_API_KEY);

const RESTAURANTS_INDEX = "restaurants";
const MOMENTS_2014_INDEX = "iconic_2014_moments";

async function indexRestaurants() {
  const records = JSON.parse(
    fs.readFileSync(path.join(DATASET_DIR, "algolia-records.json"), "utf8")
  );

  const index = client.initIndex(RESTAURANTS_INDEX);
  await index.setSettings({
    searchableAttributes: [
      "name",
      "cuisine",
      "neighborhood,city,area",
      "dining_style",
    ],
    attributesForFaceting: [
      "searchable(cuisine)",
      "dining_style",
      "price_range",
      "searchable(city)",
    ],
    customRanking: ["desc(rating)", "desc(review_count)"],
  });
  await index.saveObjects(records, { autoGenerateObjectIDIfNotExist: false });
  console.log(`Indexed ${records.length} records into "${RESTAURANTS_INDEX}"`);
}

async function index2014Moments() {
  const records = JSON.parse(
    fs.readFileSync(
      path.join(DATASET_DIR, "iconic-2014-moments.json"),
      "utf8"
    )
  );

  const index = client.initIndex(MOMENTS_2014_INDEX);
  await index.setSettings({
    searchableAttributes: ["name", "tags", "description", "category"],
    attributesForFaceting: ["category"],
  });
  await index.saveObjects(records, { autoGenerateObjectIDIfNotExist: false });
  console.log(
    `Indexed ${records.length} records into "${MOMENTS_2014_INDEX}"`
  );
}

async function main() {
  await indexRestaurants();
  await index2014Moments();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
