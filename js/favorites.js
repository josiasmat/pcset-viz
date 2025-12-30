/*
Pitch-class set visualizer
Copyright (C) 2025 Josias Matschulat

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
"use strict";


/** @type {PcSet[]} */
var favorites = [];


/** @param {PcSet} pcset @returns {Number} */
function findFavorite(pcset) {
    return favorites.findIndex((item) => item.isEqualTo(pcset.normal));
}


/** @param {PcSet} pcset @returns {Boolean}*/
function isFavorite(pcset) {
    return findFavorite(pcset) != -1;
}


/** @returns {String} */
function getFavoritesLinks() {
    return setCollectionToLinks(favorites);
}


function toggleFavorite() {
    const fav_index = findFavorite(state.pcset);
    if ( fav_index != -1 )
        favorites.splice(fav_index, 1);
    else
        favorites.push(state.pcset.normal);
    Table.updateFavorites();
    saveFavorites();
}


function loadFavorites() {
    favorites = strToPcsetArray(config_storage.readString("favorites", ""));
}


function saveFavorites() {
    config_storage.writeString("favorites", pcsetArrayToStr(favorites));
}


function saveFavoritesToFile() {
    writeStringToFile(pcsetArrayToStr(favorites), "pcset-viz-favorites.txt");
}


function loadFavoritesFromFile() {
    loadStringFromFile()
    .then((s) => {
        favorites = strToPcsetArray(s);
        Table.updateFavorites();
        hideConfigDialog();
        saveFavorites();
        requestAnimationFrame(() => requestAnimationFrame(() => 
            alert(i18n.get("alert-favorites-loaded", "Favorites loaded!"))
        ));
    })
    .catch((err) => alert(i18n.getp(
        "alert-favorites-load-error", "Error loading favorites file: %0", [err]
    )));
}
