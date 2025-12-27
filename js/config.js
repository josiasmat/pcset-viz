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


const config = {
    last_set: "",
    prime_unique: true,
    note_names: false,
    polygon: true,
    intervals: true,
    symmetry_axes: false,
    fifths: false,
    theme: "auto",
    font: "sans",
    layout: "svg-first",
    staff_clef: STAFF_CLEFS[0],
    set_format: SET_FORMATS[0],
    set_brackets: SET_BRACKETS[0],
    vector_format: VECTOR_FORMATS[0],
    inversion_format: INVERSION_FORMATS[0],
    sound_midi: false,
    sound_toggle: false,
    get table_rows() {
        return Table.rows.reduce((obj, item) => {
            obj[item.id] = item.visible;
            return obj;
        }, {});
    },
    set table_rows(obj) {
        for ( const row of Table.rows )
            row.visible = obj[row.id];
    }
}


function getRandomStartupPcSet() {
    const size = getRandomInt(5,8);
    const pcs = [];
    for ( let i = 0; i < size; i++ ) {
        let pc = getRandomInt(0,12);
        while ( pcs.includes(pc) )
            pc = getRandomInt(0,12);
        pcs.push(pc);
    }
    return new PcSet(pcs).toString("short-ab", false);
}


function readConfig() {
    config.layout = config_storage.readString("layout", "svg-first");
    config.set_format = config_storage.readString("set-format", SET_FORMATS[0]);
    config.set_brackets = config_storage.readString("set-brackets", SET_BRACKETS[0]);
    config.prime_unique = config_storage.readBool("prime-unique", true);
    config.vector_format = config_storage.readString("vector-format", VECTOR_FORMATS[0]);
    config.inversion_format = config_storage.readString("inversion-format", INVERSION_FORMATS[0]);
    config.last_set = config_storage.readString("last-set", getRandomStartupPcSet());
    config.note_names = config_storage.readBool("note_names", false);
    config.polygon = config_storage.readBool("polygon", true);
    config.symmetry_axes = config_storage.readBool("symmetry-axes", false);
    config.staff_clef = config_storage.readString("staff-clef", STAFF_CLEFS[0]);
    const fifths = config_storage.readBool("fifths", false);
    if ( config.fifths != fifths ) {
        config.fifths = fifths;
        createMainClockfaceSvg(document.getElementById("visualization-svg"));
    }
    config.theme = config_storage.readString("theme", "auto");
    config.font = config_storage.readString("font", "sans");
    config.sound_midi = config_storage.readBool("sound-midi", false);
    config.sound_toggle = config_storage.readBool("sound-toggle", false);
    for ( let row of Table.rows )
        row.visible = config_visible_data.readBool(row.id, row.visible);
    loadFavorites();
    updateInterfaceFromConfig();
}


function saveConfig() {
    config_storage.writeString("layout", config.layout);
    config_storage.writeString("set-format", config.set_format);
    config_storage.writeString("set-brackets", config.set_brackets);
    config_storage.writeBool("prime-unique", config.prime_unique);
    config_storage.writeString("vector-format", config.vector_format);
    config_storage.writeString("inversion-format", config.inversion_format);
    config_storage.writeBool("note_names", config.note_names);
    config_storage.writeBool("polygon", config.polygon);
    config_storage.writeBool("symmetry-axes", config.symmetry_axes);
    config_storage.writeBool("fifths", config.fifths);
    config_storage.writeString("theme", config.theme);
    config_storage.writeString("font", config.font);
    config_storage.writeString("staff-clef", config.staff_clef);
    config_storage.writeBool("sound-midi", config.sound_midi);
    config_storage.writeBool("sound-toggle", config.sound_toggle);
    for ( let row of Table.rows )
        config_visible_data.writeBool(row.id, row.visible);
    saveFavorites();
}


function saveConfigToFile() {
    const clone = cloneObjectExcept(config, ["last_set"]);
    saveJsonToFile(clone, "pcset-viz-config.json");
}


function loadConfigFromFile() {
    loadJsonFromFile()
    .then((obj) => {
        Object.assign(config, obj);
        updateInterfaceFromConfig();
        updateConfigDialog();
        showPcset({no_history: true});
        saveConfig();
        requestAnimationFrame(() => requestAnimationFrame(() => 
            alert("Configuration loaded!")
        ));
    })
    .catch((err) => alert(`Error loading config file: ${err}`));
}


function onVisualizationConfigChange() {
    saveConfig(); 
    updateInterfaceFromConfig();
    //drawVisualization({ keep_polygon: true });
    showPcset({ no_history: true, keep_polygon: false });
}


function onGeneralConfigChange() {
    saveConfig(); 
    updateInterfaceFromConfig(); 
    showPcset({ no_history: true, keep_input: false, keep_polygon: true });
}
