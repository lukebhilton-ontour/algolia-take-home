// Combines dataset/restaurants_list.json and dataset/restaurants_info.csv into
// a single set of Algolia-ready records, joined on objectID.
//
// Assumptions made about the data (verified against the full 5,000-row dataset):
// - Both files contain exactly the same 5,000 objectIDs, each unique, so this is
//   a clean 1:1 join with no orphans on either side.
// - The CSV is semicolon-delimited and has no quoted/escaped fields.
// - price_range only ever takes one of three fixed buckets ("$30 and under",
//   "$31 to $50", "$50 and over"), so it's parsed into numeric price_min/price_max
//   to support range filtering alongside the original label.
// - The JSON's `phone` and the CSV's `phone_number` represent the same number in
//   different formats and occasionally disagree by a digit (a source data quality
//   issue) — `phone` from the JSON is kept as canonical and phone_number is dropped.
// - The JSON's `phone` field is inconsistently formatted (dashes, parens, spaces,
//   trailing "x" extension markers) in ~half of records. All restaurants are in the
//   US, so it's cleaned to a plain 10-digit string plus an optional phone_extension
//   for any digits beyond the first 10.
// - `price` (an integer 2-4) from the JSON is renamed to `price_tier` to avoid
//   colliding with the new price_range/price_min/price_max fields.

const fs = require("fs");
const path = require("path");

const DATASET_DIR = path.join(__dirname, "..", "dataset");
const OUTPUT_PATH = path.join(DATASET_DIR, "algolia-records.json");

function parseCsv(raw) {
  const lines = raw.trim().split("\n");
  const headers = lines[0].split(";");
  return lines.slice(1).map((line) => {
    const values = line.split(";");
    const row = {};
    headers.forEach((header, i) => {
      row[header.trim()] = values[i] ? values[i].trim() : "";
    });
    return row;
  });
}

function cleanPhone(raw) {
  const digits = raw.replace(/[^0-9]/g, "");
  return {
    phone: digits.slice(0, 10),
    phone_extension: digits.slice(10) || null,
  };
}

function parsePriceRange(priceRange) {
  switch (priceRange) {
    case "$30 and under":
      return { price_min: 0, price_max: 30 };
    case "$31 to $50":
      return { price_min: 31, price_max: 50 };
    case "$50 and over":
      return { price_min: 51, price_max: null };
    default:
      return { price_min: null, price_max: null };
  }
}

function loadRestaurants() {
  const jsonRaw = fs.readFileSync(
    path.join(DATASET_DIR, "restaurants_list.json"),
    "utf8"
  );
  const csvRaw = fs.readFileSync(
    path.join(DATASET_DIR, "restaurants_info.csv"),
    "utf8"
  );

  const restaurants = JSON.parse(jsonRaw);
  const infoRows = parseCsv(csvRaw);

  const infoByObjectID = new Map(
    infoRows.map((row) => [String(row.objectID), row])
  );

  return restaurants.map((restaurant) => {
    const objectID = String(restaurant.objectID);
    const info = infoByObjectID.get(objectID);

    if (!info) {
      throw new Error(`No matching info row found for objectID ${objectID}`);
    }

    const { price, phone, ...restOfRestaurant } = restaurant;
    const { price_range, phone_number, ...restOfInfo } = info;

    return {
      ...restOfRestaurant,
      objectID,
      ...cleanPhone(phone),
      price_tier: price,
      cuisine: restOfInfo.food_type,
      dining_style: restOfInfo.dining_style,
      neighborhood: restOfInfo.neighborhood,
      rating: parseFloat(restOfInfo.stars_count),
      review_count: parseInt(restOfInfo.reviews_count, 10),
      price_range,
      ...parsePriceRange(price_range),
    };
  });
}

function main() {
  const records = loadRestaurants();
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(records, null, 2));
  console.log(`Wrote ${records.length} records to ${OUTPUT_PATH}`);
}

main();
