"use strict";

const VERSION = "2026-01-01";

const SET_FORMATS = ["short-ab","short-te","numbers","notes-sharps","notes-flats"];
const SET_BRACKETS = ["[]","{}","()"];
const VECTOR_FORMATS = ["short", "long"];
const INVERSION_FORMATS = ["In", "TnI"];
const STAFF_CLEFS = ["G2", "C3", "C4", "F4"];

/**
 * @param {Number} size 
 * @param {Boolean} [plural=false] 
 * @returns {String}
 */
function getCardinalSetName(size, plural = false) {
    return plural
        ? i18n.get(`sets-cardinality-${size}`, CARDINAL_SET_CATEGORIES[size])
        : i18n.get(`set-cardinality-${size}`, CARDINAL_SET_NAMES[size]);
}

const CARDINAL_SET_NAMES = [
    "Null set", "Singleton", "Dyad", "Trichord", "Tetrachord", 
    "Pentachord", "Hexachord", "Heptachord", "Octachord", 
    "Nonachord", "Decachord", "Undecachord", "Dodecachord"
];

const CARDINAL_SET_CATEGORIES = [
    "Null sets", "Singletons", "Dyads", "Trichords", "Tetrachords",
    "Pentachords", "Hexachords", "Heptachords", "Octachords",
    "Nonachords", "Decachords", "Undecachords", "Dodecachords"
];

const config_storage = new LocalStorageHandler("pcsetviz");
const config_visible_data = new LocalStorageHandler("pcsetviz-visible-data");
const config_export_image = new LocalStorageHandler("pcsetviz-export-image");
