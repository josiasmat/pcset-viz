/*
Pitch-class set visualizer
Copyright (C) 2024 Josias Matschulat

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


const DIALOG_SET_SEPARATOR = "&nbsp;· ";

var export_data = {
    pcset: null,
    staff: {
        clef: "G2",
        barline: "",
        accidental_swap: Array(12).fill(false),
    }
}


function showConfigDialog() {
    updateConfigDialog();
    showDialog("dialog-config");
}

function hideConfigDialog() {
    hideDialog("dialog-config");
}


/**
 * @param {String} text 
 * @param {Number} value 0 = gray, 1 = blue, 2 = green, 3 = red
 */
function updateConfigMidiStatus(text, value) {
    const midi_status_elm = document.getElementById("midi-connection-status");
    midi_status_elm.setAttribute("status", value.toString());
    midi_status_elm.innerHTML = text;
}


function updateConfigDialog() {
    const checkboxes = document.querySelectorAll("#visible-data-checkboxes-area input");
    for ( let checkbox of checkboxes ) {
        const target_id = checkbox.getAttribute("target");
        const target_elm = document.getElementById(target_id);
        checkbox.checked = !(target_elm.hasAttribute("hidden"));
    }
    document.getElementById("select-midi-mode").value = midi.mode;
    const midi_pedal_elm = document.getElementById("chk-midi-pedal");
    midi_pedal_elm.value = midi.pedal.enabled;
    midi_pedal_elm.disabled = (midi.mode == "toggle");
    const midi_select_elm = document.getElementById("select-midi-device");
    clearSelectOptions(midi_select_elm);
    const options = [addOptionToHtmlSelect(
        midi_select_elm, "", "No device available"
    )];
    requestMidiInputs( (ports) => {
        if ( ports.length > 0 )
            options[0].setAttribute("label", "None");
        for ( const port of ports ) {
            options.push(addOptionToHtmlSelect(
                midi_select_elm, port.id, port.name,
                ( midi.dev 
                    && midi.dev.name == port.name 
                    && midi.dev.state == "connected" )
            ));
        }
        if ( options.length > 1 )
            midi_select_elm.insertBefore(options[0], options[1]);
        if ( midi.dev )
            updateConfigMidiStatus("Connected", 1);
        else
            updateConfigMidiStatus("Disconnected", 0);
        //selectMidiDevice();
    }, () => {
        updateConfigMidiStatus("MIDI access denied", 3);
    });
}


function selectMidiMode() {
    midi.mode = document.getElementById("select-midi-mode").value;
    const midi_pedal_elm = document.getElementById("chk-midi-pedal");
    midi.pedal.enabled = midi_pedal_elm.checked;
    midi_pedal_elm.disabled = (midi.mode == "toggle");
    saveMidiConfig();
}


function resetVisibleDataRows() {
    Table.rows.forEach( (row) => { row.visible = row.default } );
    updateConfigDialog();
    saveConfig();
}

function setAllDataRowsVisible() {
    Table.rows.forEach( (row) => { row.show() } );
    updateConfigDialog();
    saveConfig();
}

function showAboutDialog() {
    document.getElementById("version-number").innerText = VERSION;
    showDialog("dialog-about");
}

function showPrimeSelector() {
    document.getElementById("dialog-set-selector-second-column-header").textContent = 
        ( config.prime_unique ? "Prime forms" : "Prime forms and their inverses" );
    document.getElementById("table-set-row-filter").hidden = true;

    // set of cardinality 0, 1, 11 & 12
    const table_row_0 = document.getElementById("table-set-row0");
    table_row_0.parentElement.style.display = "table-row";
    table_row_0.innerHTML = [
        makeSelectorSetLink("", new PcSet().toString(config.set_format, config.set_brackets)),
        makeSelectorSetLink("0", new PcSet("0").toString(config.set_format, config.set_brackets)),
        makeSelectorSetLink("0123456789A", new PcSet("0123456789A").toString(config.set_format, config.set_brackets)),
        makeSelectorSetLink("0123456789AB", new PcSet("0123456789AB").toString(config.set_format, config.set_brackets))
    ].join(DIALOG_SET_SEPARATOR);

    // remaining sets
    for ( let i = 2; i < 11; i++ ) {
        let links = []
        for ( let entry of Object.entries(PCSET_CATALOG[i]) ) {
            const set = entry[0].slice(1,-1);
            const text = new PcSet(set).toString(config.set_format, config.set_brackets);
            links.push(makeSelectorSetLink(set, text));
            if ( !config.prime_unique && entry[1].inv ) {
                const inv_set = entry[1].inv.slice(1,-1);
                const inv_text = new PcSet(inv_set).toString(config.set_format, config.set_brackets);
                links.push(makeSelectorSetLink(inv_set, inv_text));
            }
        }
        const id = `table-set-row${( i>1 && i<11 ) ? i : 0}`;
        const elm = document.getElementById(id);
        elm.parentElement.style.display = "table-row";
        elm.innerHTML = links.join(DIALOG_SET_SEPARATOR);
    }

    showDialog("dialog-set-selector");
}


function showForteSelector() {
    document.getElementById("dialog-set-selector-second-column-header").textContent = "Forte/Morris names";
    document.getElementById("table-set-row-filter").hidden = true;

    // set of cardinality 0, 1, 11 & 12
    const table_row_0 = document.getElementById("table-set-row0");
    table_row_0.parentElement.style.display = "table-row";
    table_row_0.innerHTML = [
        makeSelectorSetLink("", "0-1"),
        makeSelectorSetLink("0", "1-1"),
        makeSelectorSetLink("0123456789A", "11-1"),
        makeSelectorSetLink("0123456789AB", "12-1")
    ].join(DIALOG_SET_SEPARATOR);

    // remaining sets
    for ( let i = 2; i < 11; i++ ) {
        let links = []
        for ( let entry of Object.entries(PCSET_CATALOG[i]) ) {
            const set = entry[0].slice(1,-1);
            const name = entry[1].fn;
            if ( !config.prime_unique && entry[1].inv ) {
                const inv = entry[1].inv.slice(1,-1);
                links.push(makeSelectorSetLink(set, name+'A'));
                links.push(makeSelectorSetLink(inv, name+'B'));
            } else
                links.push(makeSelectorSetLink(set, name));
        }
        const id = `table-set-row${( i>1 && i<11 ) ? i : 0}`;
        const elm = document.getElementById(id);
        elm.parentElement.style.display = "table-row";
        elm.innerHTML = links.join(DIALOG_SET_SEPARATOR);
    }

    showDialog("dialog-set-selector");
}


function showCarterSelector() {
    document.getElementById("dialog-set-selector-second-column-header").textContent = "Carter numbers";
    document.getElementById("table-set-row-filter").hidden = true;

    // no carter numbers for cardinality 0, 1, 11 & 12
    const table_row_0 = document.getElementById("table-set-row0");
    table_row_0.parentElement.style.display = "none";
    table_row_0.innerText = "";

    // remaining sets
    for ( let i = 2; i < 11; i++ ) {
        let sets = [];
        for ( let entry of Object.entries(PCSET_CATALOG[i]) ) {
            sets = sets.concat([[entry[0].slice(1,-1), entry[1].cn]])
        }
        sets.sort((a,b) => a[1] - b[1]);
        const id = `table-set-row${( i>1 && i<11 ) ? i : 0}`;
        const elm = document.getElementById(id);
        elm.parentElement.style.display = "table-row";
        elm.innerHTML = sets.map((set) => makeSelectorSetLink(set[0], parseInt(set[1]))).join(DIALOG_SET_SEPARATOR);
    }

    showDialog("dialog-set-selector");
}


function showDescriptionSelector() {
    document.getElementById("dialog-set-selector-second-column-header").textContent = "Descriptive names";
    document.getElementById("table-set-row-filter").hidden = false;

    const input_filter = recreateNode(document.getElementById("input-set-filter"));
    input_filter.value = "";

    function updateDescriptionSelector() {

        let filter_str = input_filter.value;
        const filters = filter_str.trim().toLowerCase().split(" ");

        function filterName(name) {
            if ( !filter_str ) return true;
            name = name.toLowerCase();
            for ( const filter of filters ) {
                if ( !name.includes(filter) )
                    return false;
            }
            return true;
        }

        // collect names
        let sets = Array(13);
        for ( let i = 0; i < 13; i++ ) sets[i] = [];
        for ( let entry of Object.entries(string_data["sets"]) ) {
            const set = new PcSet(entry[0]);
            const len = set.size; //entry[0].length-2;
            const str_short = set.toString("short-ab", null);// entry[0].substring(1,len+1);
            const str_full = set.toString(config.set_format, config.set_brackets);
            const hint = `${str_full} (${config.prime_unique ? set.forte_name : set.forte_name_ab})\n${entry[1]["names"].join("\n")}`;
            for ( let name of entry[1]["names"] ) {
                if ( filterName(name) ) {
                    const link = makeSelectorSetLink(str_short,name, {hint:hint,nosetfont:true});
                    sets[len].push({name:name,set:str_short,link:link});
                } //else {
                //    sets[len].push({name:name,set:str_short,link:`<span class="disabled-link">${name}</span>`});
                //}
            }
        }
        for ( let i of [1,11,12] ) {
            sets[0].push(...sets[i]);
            sets[i] = [];
        }
        for ( let array of sets )
            if ( array.length > 1 )
                array.sort((a,b) => a.name.localeCompare(b.name));

        document.getElementById("table-set-row0").parentElement.style.display = "table-row";

        for ( let i of [0,2,3,4,5,6,7,8,9,10] ) {
            let links = sets[i].map((x) => x.link);
            const id = `table-set-row${i}`;
            const elm = document.getElementById(id);
            elm.parentElement.style.display = "table-row";
            elm.innerHTML = links.join("&nbsp;· ");
        }
    }

    const dialog_elm = document.getElementById("dialog-set-selector");
    const dialog_style = getComputedStyle(dialog_elm);
    dialog_elm.style.width = dialog_style.maxWidth;
    dialog_elm.style.height = dialog_style.maxHeight;

    updateDescriptionSelector();
    showDialog("dialog-set-selector");
    input_filter.addEventListener("input", updateDescriptionSelector);

}


function showSubsetSelector() {
    const superset = state.pcset.normal;
    document.getElementById("dialog-set-selector-second-column-header").setHTMLUnsafe( 
        `Subsets of <span class="setfont">${superset.toString(config.set_format, config.set_brackets)}</span>`);
    document.getElementById("table-set-row-filter").hidden = true;

    const subsets = superset.getSubsets();
    subsets.sort((a,b) => a.binary_value - b.binary_value);

    let links = Array(13);
    for ( let i = 0; i < 13; i++ ) links[i] = [];

    for ( let subset of subsets ) {
        const set = subset.toString("short-ab", null);
        const text = subset.toString(config.set_format, config.set_brackets);
        links[subset.size].push(makeSelectorSetLink(set, text));
    }

    // set of cardinality 0, 1, 11 & 12
    const table_row_0 = document.getElementById("table-set-row0");
    table_row_0.parentElement.style.display = "table-row";
    table_row_0.innerHTML = links[0].concat(links[1]).concat(links[11]).concat(links[12]).join(DIALOG_SET_SEPARATOR);

    // remaining sets
    for ( let i = 2; i < 11; i++ ) {
        const id = `table-set-row${( i>1 && i<11 ) ? i : 0}`;
        const elm = document.getElementById(id);
        elm.parentElement.style.display = (links[i].length == 0) ? "none" : "table-row";
        elm.innerHTML = links[i].join(DIALOG_SET_SEPARATOR);
    }

    showDialog("dialog-set-selector");
}


function showPrimeSubsetSelector() {
    const superset = state.pcset.prime;
    document.getElementById("dialog-set-selector-second-column-header").setHTMLUnsafe( 
        `Prime subsets of <span class="setfont">${superset.toString(config.set_format, config.set_brackets)}</span>`);
    document.getElementById("table-set-row-filter").hidden = true;

    const subsets = superset.getPrimeSubsets();
    //subsets.sort((a,b) => a.binary_value - b.binary_value);

    let links = Array(13);
    for ( let i = 0; i < 13; i++ ) links[i] = [];

    for ( let subset of subsets ) {
        const set = subset.toString("short-ab", null);
        const text = subset.toString(config.set_format, config.set_brackets);
        links[subset.size].push(makeSelectorSetLink(set, text));
    }

    // set of cardinality 0, 1, 11 & 12
    const table_row_0 = document.getElementById("table-set-row0");
    table_row_0.parentElement.style.display = "table-row";
    table_row_0.innerHTML = links[0].concat(links[1]).concat(links[11]).concat(links[12]).join(DIALOG_SET_SEPARATOR);

    // remaining sets
    for ( let i = 2; i < 11; i++ ) {
        const id = `table-set-row${( i>1 && i<11 ) ? i : 0}`;
        const elm = document.getElementById(id);
        elm.parentElement.style.display = (links[i].length == 0) ? "none" : "table-row";
        elm.innerHTML = links[i].join(DIALOG_SET_SEPARATOR);
    }

    showDialog("dialog-set-selector");
}


/**
 * Shows the set selector.
 * @param {String} type Type of set selector: _null_, "forte", "carter" or "description".
 */
function showSetSelector(type = null) {
    switch (type) {
        case "forte": showForteSelector(); break;
        case "carter": showCarterSelector(); break;
        case "description": showDescriptionSelector(); break;
        case "subset": showSubsetSelector(); break;
        default: showPrimeSelector();
    }
}


function showExportImageDialog() {
    export_data.pcset = state.pcset.clone();
    export_data.staff.accidental_swap = Array.from(state.staff_accidental_swap);
    loadImageExportDialogSettings();
    showDialog("dialog-export-image");
    updateImageExportDialog();
}


function imageExportDialogValidateControls() {
    const input_inversion_index = document.getElementById("expimg-inversion-index");
    const inversion_index = parseInt(input_inversion_index.value);
    if ( inversion_index < 0 )
        input_inversion_index.value = 12 + inversion_index;
    else if ( inversion_index > 11 )
        input_inversion_index.value = inversion_index - 12;
    
    const input_transposition_index = document.getElementById("expimg-transposition-index");
    let transposition_index = parseInt(input_transposition_index.value);
    const transposition_previous = parseInt(input_transposition_index.getAttribute("previous"));
    if ( transposition_index < -11 )
        input_transposition_index.value = transposition_index = -1;
    else if ( transposition_index > 11 )
        input_transposition_index.value = transposition_index = 1;
    else if ( transposition_index == 0 )
        input_transposition_index.value = transposition_index = ( (transposition_previous > 0) ? -1 : 1 );
    input_transposition_index.setAttribute("previous", transposition_index);
    
    const input_tonnetz_centerpc = document.getElementById("expimg-tonnetz-centerpc");
    const tonnetz_centerpc = parseInt(input_tonnetz_centerpc.value);
    if ( tonnetz_centerpc < 0 )
        input_tonnetz_centerpc.value = 12 + tonnetz_centerpc;
    else if ( tonnetz_centerpc > 11 )
        input_tonnetz_centerpc.value = tonnetz_centerpc - 12;

    const tonnetz_width = parseInt(document.getElementById("expimg-tonnetz-width").value);
    const tonnetz_height = parseInt(document.getElementById("expimg-tonnetz-height").value);
    const input_tonnetz_h_cut = document.getElementById("expimg-tonnetz-h-cut");
    const tonnetz_h_cut = parseInt(input_tonnetz_h_cut.value);
    const max_h_cut = Math.min(tonnetz_width, tonnetz_height)-1;
    input_tonnetz_h_cut.setAttribute("max", max_h_cut);
    if ( tonnetz_h_cut > max_h_cut )
        input_tonnetz_h_cut.value = max_h_cut;
    
}


function updateImageExportDialog() {
    const file_type = document.querySelector('input[name="export-file-type"]:checked').value;
    document.getElementById("export-image-download-svg-link").hidden = (file_type != "svg");
    document.getElementById("export-image-download-png-link").hidden = (file_type != "png");
    document.getElementById("span-input-export-file-png-size").hidden = (file_type != "png");
    document.getElementById("export-image-copy-link").hidden = 
        !( ClipboardItem.supports( ( file_type == "svg") ? "image/svg+xml" : "image/png" ) );

    const graphics_type = document.getElementById("expimg-select-type").value;

    for ( const elm of document.querySelectorAll("#dialog-export-options *[includetype]") )
        elm.hidden = !(elm.getAttribute("includetype").includes(graphics_type));
    for ( const elm of document.querySelectorAll("#dialog-export-options *[excludetype]") )
        elm.hidden = (elm.getAttribute("excludetype").includes(graphics_type));

    document.getElementById("chk-export-note-names").disabled = 
        ( document.querySelector('input[name="expimg-show-text"]:checked').value == "never" );

    const theme = getImageExportTheme();

    function exportStaffPreviewClick(elm, type, index) {
        if ( type == "note" && ![2,7,9].includes(index) ) {
            elm.style.cursor = "pointer";
            elm.style.pointerEvents = "bounding-box";
            elm.setAttribute("onclick", `exportStaffNoteClick(${index})`);
        }
    }

    imageExportDialogValidateControls();
    
    const preview = makeSetImage(graphics_type);
    preview.svg.setAttribute("width", "100%");
    preview.svg.setAttribute("height", "100%");
    preview.svg.setAttribute("max-width", "100%");
    preview.svg.setAttribute("max-height", "100%");
    const div_preview = document.getElementById("dialog-export-preview");
    div_preview.style.backgroundColor = ( GRAPHICS_THEMES[theme].bg_type == "dark" )
        ? "var(--bg-dark)" : "var(--bg-light)"
    div_preview.setHTMLUnsafe(preview.svg.outerHTML);
    saveImageExportDialogSettings();
}


function getImageExportTheme() {
    const theme_elm = document.getElementById("expimg-select-theme");
    const bg_elm    = document.getElementById("expimg-select-theme-bg");
    const color_elm = document.getElementById("expimg-select-theme-color");
    const theme = [
        (theme_elm.checkVisibility() ? theme_elm.value : "basic"),
        (bg_elm.checkVisibility()    ? bg_elm.value    : "light"),
        (color_elm.checkVisibility() ? color_elm.value : "")
    ].filter( (s) => s ).join('-');
    return theme;
}


function exportStaffShiftNotes(amount) {
    export_data.pcset.shift(amount);
    updateImageExportDialog();
}


function exportStaffNoteClick(pc) {
    export_data.staff.accidental_swap[pc] = !export_data.staff.accidental_swap[pc];
    updateImageExportDialog();
}


function loadImageExportDialogSettings() {
    document.getElementById("chk-export-note-names").checked = config_export_image.readBool("note-names", config.note_names);
    document.querySelector(`input[name="expimg-show-text"][value="${config_export_image.readString("text-show", "always")}"]`).checked = true;
    document.getElementById("chk-export-polygon").checked = config_export_image.readBool("polygon", config.polygon);
    document.getElementById("chk-export-sym-axes").checked = config_export_image.readBool("symmetry_axes", config.symmetry_axes);
    document.getElementById("chk-export-fifths").checked = config_export_image.readBool("fifths", config.fifths);
    document.getElementById("chk-export-double-row").checked = config_export_image.readBool("double-row", false);
    document.getElementById("chk-export-ic1").checked = config_export_image.readBool("ic1", false);
    document.getElementById("chk-export-ic2").checked = config_export_image.readBool("ic2", false);
    document.getElementById("chk-export-ic3").checked = config_export_image.readBool("ic3", false);
    document.getElementById("chk-export-ic4").checked = config_export_image.readBool("ic4", false);
    document.getElementById("chk-export-ic5").checked = config_export_image.readBool("ic5", false);
    document.getElementById("chk-export-ic6").checked = config_export_image.readBool("ic6", false);
    document.getElementById("expimg-inversion-index").value = config_export_image.readNumber("inversion-index", 0);
    document.getElementById("chk-export-inversion-axis").checked = config_export_image.readBool("inversion-axis", true);
    document.getElementById("chk-all-paths").checked = config_export_image.readBool("inv-transp-all-paths", true);
    document.getElementById("expimg-tonnetz-centerpc").value = config_export_image.readNumber("tonnetz-centerpc", 0);
    document.getElementById("expimg-tonnetz-width").value = config_export_image.readNumber("tonnetz-width", 6);
    document.getElementById("expimg-tonnetz-height").value = config_export_image.readNumber("tonnetz-height", 5);
    document.getElementById("expimg-tonnetz-h-cut").value = config_export_image.readNumber("tonnetz-h-cut", 0);
    document.getElementById("chk-tonnetz-fill-faces").checked = config_export_image.readBool("tonnetz-fill-faces", true);
    document.getElementById("chk-tonnetz-all-vertices").checked = config_export_image.readBool("tonnetz-all-vertices", true);
    document.getElementById("chk-tonnetz-all-edges").checked = config_export_image.readBool("tonnetz-all-edges", true);
    document.getElementById("chk-tonnetz-extended-edges").checked = config_export_image.readBool("tonnetz-extended-edges", false);
    document.getElementById("expimg-select-theme").value = config_export_image.readString("theme", "basic");
    document.getElementById("expimg-select-theme-color").value = config_export_image.readString("theme-color", "");
    document.getElementById("expimg-select-theme-bg").value = config_export_image.readString("theme-bg", "light");
    document.getElementById("expimg-select-staff-clef").value = config_export_image.readString("staff-clef", "G2");
    document.getElementById("expimg-select-staff-notehead").value = config_export_image.readString("staff-notehead", "q");
    document.getElementById("expimg-select-staff-barline").value = config_export_image.readString("staff-barline", "");
    document.getElementById("expimg-scale").value = config_export_image.readNumber("scale", 1.15);
    document.getElementById("expimg-stroke").value = config_export_image.readNumber("stroke-width", 2.0);
    document.querySelector(`input[name="export-file-type"][value="${config_export_image.readString("format", "svg")}"]`).checked = true;
    document.getElementById("input-export-file-png-size").value = config_export_image.readNumber("png-width", 1000);
}


function saveImageExportDialogSettings() {
    config_export_image.writeBool("note-names", document.getElementById("chk-export-note-names").checked);
    config_export_image.writeString("text-show", document.querySelector('input[name="expimg-show-text"]:checked').value);
    config_export_image.writeBool("polygon", document.getElementById("chk-export-polygon").checked);
    config_export_image.writeBool("symmetry_axes", document.getElementById("chk-export-sym-axes").checked);
    config_export_image.writeBool("fifths", document.getElementById("chk-export-fifths").checked);
    config_export_image.writeBool("double-row", document.getElementById("chk-export-double-row").checked);
    config_export_image.writeBool("ic1", document.getElementById("chk-export-ic1").checked);
    config_export_image.writeBool("ic2", document.getElementById("chk-export-ic2").checked);
    config_export_image.writeBool("ic3", document.getElementById("chk-export-ic3").checked);
    config_export_image.writeBool("ic4", document.getElementById("chk-export-ic4").checked);
    config_export_image.writeBool("ic5", document.getElementById("chk-export-ic5").checked);
    config_export_image.writeBool("ic6", document.getElementById("chk-export-ic6").checked);
    config_export_image.writeNumber("inversion-index", parseInt(document.getElementById("expimg-inversion-index").value));
    config_export_image.writeBool("inversion-axis", document.getElementById("chk-export-inversion-axis").checked);
    config_export_image.writeBool("inv-transp-all-paths", document.getElementById("chk-all-paths").checked);
    config_export_image.writeNumber("tonnetz-centerpc", parseInt(document.getElementById("expimg-tonnetz-centerpc").value));
    config_export_image.writeNumber("tonnetz-width", parseInt(document.getElementById("expimg-tonnetz-width").value));
    config_export_image.writeNumber("tonnetz-height", parseInt(document.getElementById("expimg-tonnetz-height").value));
    config_export_image.writeNumber("tonnetz-h-cut", parseInt(document.getElementById("expimg-tonnetz-h-cut").value));
    config_export_image.writeBool("tonnetz-fill-faces", document.getElementById("chk-tonnetz-fill-faces").checked);
    config_export_image.writeBool("tonnetz-all-vertices", document.getElementById("chk-tonnetz-all-vertices").checked);
    config_export_image.writeBool("tonnetz-all-edges", document.getElementById("chk-tonnetz-all-edges").checked);
    config_export_image.writeBool("tonnetz-extended-edges", document.getElementById("chk-tonnetz-extended-edges").checked);
    config_export_image.writeString("theme", document.getElementById("expimg-select-theme").value);
    config_export_image.writeString("theme-color", document.getElementById("expimg-select-theme-color").value);
    config_export_image.writeString("theme-bg", document.getElementById("expimg-select-theme-bg").value);
    config_export_image.writeString("staff-clef", document.getElementById("expimg-select-staff-clef").value);
    config_export_image.writeString("staff-notehead", document.getElementById("expimg-select-staff-notehead").value);
    config_export_image.writeString("staff-barline", document.getElementById("expimg-select-staff-barline").value);
    config_export_image.writeNumber("scale", document.getElementById("expimg-scale").value);
    config_export_image.writeNumber("stroke-width", document.getElementById("expimg-stroke").value);
    config_export_image.writeString("format", document.querySelector('input[name="export-file-type"]:checked').value);
    config_export_image.writeNumber("png-width", document.getElementById("input-export-file-png-size").value);
}


function makeClockfaceSvgFromParams(theme) {
    return new StaticClockfaceView(
        export_data.pcset.normal, 
        {
            note_names: document.getElementById("chk-export-note-names").checked,
            show_text: document.querySelector('input[name="expimg-show-text"]:checked').value,
            polygon: document.getElementById("chk-export-polygon").checked, 
            symmetry_axes: document.getElementById("chk-export-sym-axes").checked,
            fifths: document.getElementById("chk-export-fifths").checked,
            scale: parseFloat(document.getElementById("expimg-scale").value),
            stroke_width: parseFloat(document.getElementById("expimg-stroke").value),
        },
        theme
    );
}

function makeClockfaceIntervalsSvgFromParams(theme) {
    const interval_classes = [];
    if ( document.getElementById("chk-export-ic1").checked ) interval_classes.push(1);
    if ( document.getElementById("chk-export-ic2").checked ) interval_classes.push(2);
    if ( document.getElementById("chk-export-ic3").checked ) interval_classes.push(3);
    if ( document.getElementById("chk-export-ic4").checked ) interval_classes.push(4);
    if ( document.getElementById("chk-export-ic5").checked ) interval_classes.push(5);
    if ( document.getElementById("chk-export-ic6").checked ) interval_classes.push(6);
    return new StaticClockfaceView(
        export_data.pcset.normal, 
        {
            note_names: document.getElementById("chk-export-note-names").checked,
            show_text: document.querySelector('input[name="expimg-show-text"]:checked').value,
            fifths: document.getElementById("chk-export-fifths").checked,
            scale: parseFloat(document.getElementById("expimg-scale").value),
            stroke_width: parseFloat(document.getElementById("expimg-stroke").value),
            intervals: interval_classes,
        },
        theme
    );
}

function makeClockfaceInversionSvgFromParams(theme) {
    return new StaticClockfaceView(
        export_data.pcset.normal, 
        {
            inversion: parseInt(document.getElementById("expimg-inversion-index").value),
            active_paths_only: !document.getElementById("chk-all-paths").checked,
            inversion_axis: document.getElementById("chk-export-inversion-axis").checked,
            note_names: document.getElementById("chk-export-note-names").checked,
            show_text: document.querySelector('input[name="expimg-show-text"]:checked').value,
            fifths: document.getElementById("chk-export-fifths").checked,
            scale: parseFloat(document.getElementById("expimg-scale").value),
            stroke_width: parseFloat(document.getElementById("expimg-stroke").value),
        },
        theme
    );
}

function makeClockfaceTranspositionSvgFromParams(theme) {
    return new StaticClockfaceView(
        export_data.pcset.normal, 
        {
            transposition: parseInt(document.getElementById("expimg-transposition-index").value),
            active_paths_only: !document.getElementById("chk-all-paths").checked,
            note_names: document.getElementById("chk-export-note-names").checked,
            show_text: document.querySelector('input[name="expimg-show-text"]:checked').value,
            fifths: document.getElementById("chk-export-fifths").checked,
            scale: parseFloat(document.getElementById("expimg-scale").value),
            stroke_width: parseFloat(document.getElementById("expimg-stroke").value),
        },
        theme
    );
}

function makeRulerSvgFromParams(theme) {
    return new StaticRulerPcSetView(
        export_data.pcset.normal, 
        {
            note_names: document.getElementById("chk-export-note-names").checked,
            show_text: document.querySelector('input[name="expimg-show-text"]:checked').value,
            symmetry_axes: document.getElementById("chk-export-sym-axes").checked,
            stroke_width: parseFloat(document.getElementById("expimg-stroke").value),
            start: parseInt(document.getElementById("expimg-first-pc").value),
            double_row: document.getElementById("chk-export-double-row").checked
        },
        theme
    );
}

function makeStaffSvgFromParams(theme, callback = null) {
    const scale = MusicalScale.fromPcset(export_data.pcset);
    return new StaticStaffPcSetView(
        scale, 
        {
            clef: document.getElementById("expimg-select-staff-clef").value,
            notehead: document.getElementById("expimg-select-staff-notehead").value,
            barline: document.getElementById("expimg-select-staff-barline").value,
            accidental_swap: export_data.staff.accidental_swap.reduce(
                (a, x, i) => {if (x) a.push(i); return a;}, []
            ),
            stroke_width: parseFloat(document.getElementById("expimg-stroke").value),
            fn: callback ?? null
        },
        theme
    );
}

function makeTonnetzSvgFromParams(theme) {
    return new StaticTonnetzPcSetView(
        export_data.pcset.normal, 
        {
            centerpc: parseInt(document.getElementById("expimg-tonnetz-centerpc").value),
            width: parseInt(document.getElementById("expimg-tonnetz-width").value),
            height: parseInt(document.getElementById("expimg-tonnetz-height").value),
            h_cut: parseInt(document.getElementById("expimg-tonnetz-h-cut").value),
            note_names: document.getElementById("chk-export-note-names").checked,
            show_text: document.querySelector('input[name="expimg-show-text"]:checked').value,
            fill_faces: document.getElementById("chk-tonnetz-fill-faces").checked,
            all_vertices: document.getElementById("chk-tonnetz-all-vertices").checked,
            all_edges: document.getElementById("chk-tonnetz-all-edges").checked,
            extended_edges: document.getElementById("chk-tonnetz-extended-edges").checked,
            scale: parseFloat(document.getElementById("expimg-scale").value),
            stroke_width: parseFloat(document.getElementById("expimg-stroke").value),
        },
        theme
    );
}

function makeSetImage(graphics_type) {
    const theme = getImageExportTheme();
    switch ( graphics_type ) {
        case "clockface-set"          : return makeClockfaceSvgFromParams(theme);
        case "clockface-intervals"    : return makeClockfaceIntervalsSvgFromParams(theme);
        case "clockface-inversion"    : return makeClockfaceInversionSvgFromParams(theme);
        case "clockface-transposition": return makeClockfaceTranspositionSvgFromParams(theme);
        case "ruler-set"              : return makeRulerSvgFromParams(theme);
        case "staff-set"              : return makeStaffSvgFromParams(theme);
        case "tonnetz-set"            : return makeTonnetzSvgFromParams(theme);
    }
    return null;
}

function downloadImage(type) {
    const graphics_type = document.getElementById("expimg-select-type").value;
    const svg = makeSetImage(graphics_type);
    const image_size = document.getElementById("input-export-file-png-size").value;
    switch ( type ) {
        case "svg": svg.downloadSvg(); break;
        case "png": svg.downloadPng(image_size); break;
    }
}

function copyImageToClipboard() {
    const type = document.querySelector('input[name="export-file-type"]:checked').value;
    const graphics_type = document.getElementById("expimg-select-type").value;
    const svg = makeSetImage(graphics_type);
    if ( type == "svg" )
        svg.svgToClipboard();
    else {
        const image_size = document.getElementById("input-export-file-png-size").value;
        svg.pngToClipboard(image_size, image_size);
    }
}

function elementDisableFocus(elm) {
    elm.setAttribute("tabindex", "-1");
    for ( const child of elm.children ) elementDisableFocus(child);
}

function elementEnableFocus(elm) {
    elm.removeAttribute("tabindex");
    for ( const child of elm.children ) elementEnableFocus(child);
}

function showDialog(id) {
    const dialog_elm = document.getElementById(id);
    dialog_elm.addEventListener("close", (e) => {
        e.currentTarget.style.removeProperty("width");
        e.currentTarget.style.removeProperty("height");
    });
    dialog_elm.showModal();
}

function hideDialog(id) {
    const dialog_elm = document.getElementById(id);
    dialog_elm.close();
}

function hideAllDialogs() {
    for ( let dialog of document.querySelectorAll(".dialog-container") )
        hideDialog(dialog.id);
}

function makeSelectorSetLink(set, text, options = {}) {
    const attr_class = options.nosetfont ? '' : ' class="setfont"';
    const attr_title = options.hint ? ` title="${options.hint}"` : '';
    return `<a${attr_class} href="javascript:goto('${set}')"${attr_title}>${text}</a>`;    
}

function handleDialogClick(e) {
    if ( this == e.target ) {
        const rect = this.getBoundingClientRect();
        if ( !isInsideRect(rect, e.clientX, e.clientY) )
            hideDialog(this.id);
    }
}

// Make all dialogs close when clicked outside them
for ( const dg of document.querySelectorAll("dialog.dialog-container") ) {
    dg.addEventListener("click", handleDialogClick, { passive: true });
}

// Make close buttons
for ( const elm of document.querySelectorAll(".close-button") ) {
    const svg = SvgTools.createRootElement({
         "class": "svg-icon",
         "viewbox": [0, 0, SVG_ICONS.close.w, SVG_ICONS.close.h].join(' ')
    });
    svg.appendChild(
        SvgTools.makePath(SVG_ICONS.close.d)
    );
    elm.setHTMLUnsafe(svg.outerHTML);
}
