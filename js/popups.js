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


const POPUP_SET_SEPARATOR = "&nbsp;· ";

var export_data = {
    pcset: null,
    staff: {
        clef: "G2",
        barline: "",
        accidental_swap: Array(12).fill(false),
    }
}


function showConfigPopup() {
    updateConfigPopup();
    showPopup("popup-config");
    //document.getElementById("popup-config").style.display="flex";
}


function updateConfigPopup() {
    const checkboxes = document.querySelectorAll("#visible-data-checkboxes-area input");
    for ( let checkbox of checkboxes ) {
        const target_id = checkbox.getAttribute("target");
        const target_elm = document.getElementById(target_id);
        checkbox.checked = !(target_elm.hasAttribute("hidden"));
    }
    document.getElementById("select-midi-mode").value = midi.mode;
    const midi_select_elm = document.getElementById("select-midi-device");
    const midi_status_elm = document.getElementById("midi-connection-status");
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
        midi_status_elm.innerHTML = ( midi.dev ) ? "Connected" : "Disconnected";
        //selectMidiDevice();
    }, () => {
        midi_status_elm.innerHTML = "MIDI access denied";
    });
}


function resetVisibleDataRows() {
    data_rows.forEach( (row) => { row.visible = row.default } );
    updateConfigPopup();
    saveConfig();
}

function setAllDataRowsVisible() {
    data_rows.forEach( (row) => { row.show() } );
    updateConfigPopup();
    saveConfig();
}

function showAboutPopup() {
    document.getElementById("version-number").innerText = VERSION;
    showPopup("popup-about");
    //document.getElementById("popup-about").style.display="flex";
}

function showPrimeSelector() {
    document.getElementById("popup-set-selector-second-column-header").textContent = "Prime forms";
    document.getElementById("table-set-row-filter").hidden = true;

    // set of cardinality 0, 1, 11 & 12
    const table_row_0 = document.getElementById("table-set-row0");
    table_row_0.parentElement.style.display = "table-row";
    table_row_0.innerHTML = [
        makeSelectorSetLink("", new PcSet().toString(config.set_format, true)),
        makeSelectorSetLink("0", new PcSet("0").toString(config.set_format, true)),
        makeSelectorSetLink("0123456789A", new PcSet("0123456789A").toString(config.set_format, true)),
        makeSelectorSetLink("0123456789AB", new PcSet("0123456789AB").toString(config.set_format, true))
    ].join(POPUP_SET_SEPARATOR);

    // remaining sets
    for ( let i = 2; i < 11; i++ ) {
        let links = []
        for ( let entry of Object.entries(PCSET_CATALOG[i]) ) {
            const set = entry[0].slice(1,-1);
            const text = new PcSet(entry[0]).toString(config.set_format, true);
            links.push(makeSelectorSetLink(set, text));
        }
        const id = `table-set-row${( i>1 && i<11 ) ? i : 0}`;
        const elm = document.getElementById(id);
        elm.parentElement.style.display = "table-row";
        elm.innerHTML = links.join(POPUP_SET_SEPARATOR);
    }

    showPopup("popup-set-selector");
}


function showForteSelector() {
    document.getElementById("popup-set-selector-second-column-header").textContent = "Forte/Morris names";
    document.getElementById("table-set-row-filter").hidden = true;

    // set of cardinality 0, 1, 11 & 12
    const table_row_0 = document.getElementById("table-set-row0");
    table_row_0.parentElement.style.display = "table-row";
    table_row_0.innerHTML = [
        makeSelectorSetLink("", "0-1"),
        makeSelectorSetLink("0", "1-1"),
        makeSelectorSetLink("0123456789A", "11-1"),
        makeSelectorSetLink("0123456789AB", "12-1")
    ].join(POPUP_SET_SEPARATOR);

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
        elm.innerHTML = links.join(POPUP_SET_SEPARATOR);
    }

    showPopup("popup-set-selector");
}


function showCarterSelector() {
    document.getElementById("popup-set-selector-second-column-header").textContent = "Carter numbers";
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
        elm.innerHTML = sets.map((set) => makeSelectorSetLink(set[0], parseInt(set[1]))).join(POPUP_SET_SEPARATOR);
    }

    showPopup("popup-set-selector");
}


function showDescriptionSelector() {
    document.getElementById("popup-set-selector-second-column-header").textContent = "Descriptive names";
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
            const str_short = set.toString("short-ab", false);// entry[0].substring(1,len+1);
            const str_full = set.toString(config.set_format, true);
            const hint = `${str_full} (${set.forte_name(config.prime_unique)})\n${entry[1]["names"].join("\n")}`;
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

    const popup_elm = document.getElementById("popup-set-selector");
    const popup_style = getComputedStyle(popup_elm);
    popup_elm.style.width = popup_style.maxWidth;
    popup_elm.style.height = popup_style.maxHeight;

    updateDescriptionSelector();
    showPopup("popup-set-selector");
    // input_filter.focus();
    input_filter.addEventListener("input", updateDescriptionSelector);

}


function showSubsetSelector() {
    const superset = state.pcset.normal;
    document.getElementById("popup-set-selector-second-column-header").setHTMLUnsafe( 
        `Subsets of <span class="setfont">${superset.toString(config.set_format, true)}</span>`);
    document.getElementById("table-set-row-filter").hidden = true;

    const subsets = superset.subsets();
    subsets.sort((a,b) => a.binary_value - b.binary_value);

    let links = Array(13);
    for ( let i = 0; i < 13; i++ ) links[i] = [];

    for ( let subset of subsets ) {
        const set = subset.toString("short-ab", false);
        const text = subset.toString(config.set_format, true);
        links[subset.size].push(makeSelectorSetLink(set, text));
    }

    // set of cardinality 0, 1, 11 & 12
    const table_row_0 = document.getElementById("table-set-row0");
    table_row_0.parentElement.style.display = "table-row";
    table_row_0.innerHTML = links[0].concat(links[1]).concat(links[11]).concat(links[12]).join(POPUP_SET_SEPARATOR);

    // remaining sets
    for ( let i = 2; i < 11; i++ ) {
        const id = `table-set-row${( i>1 && i<11 ) ? i : 0}`;
        const elm = document.getElementById(id);
        elm.parentElement.style.display = (links[i].length == 0) ? "none" : "table-row";
        elm.innerHTML = links[i].join(POPUP_SET_SEPARATOR);
    }

    showPopup("popup-set-selector");
}


function showPrimeSubsetSelector() {
    const superset = state.pcset.prime;
    document.getElementById("popup-set-selector-second-column-header").setHTMLUnsafe( 
        `Prime subsets of <span class="setfont">${superset.toString(config.set_format, true)}</span>`);
    document.getElementById("table-set-row-filter").hidden = true;

    const subsets = superset.prime_subsets();
    //subsets.sort((a,b) => a.binary_value - b.binary_value);

    let links = Array(13);
    for ( let i = 0; i < 13; i++ ) links[i] = [];

    for ( let subset of subsets ) {
        const set = subset.toString("short-ab", false);
        const text = subset.toString(config.set_format, true);
        links[subset.size].push(makeSelectorSetLink(set, text));
    }

    // set of cardinality 0, 1, 11 & 12
    const table_row_0 = document.getElementById("table-set-row0");
    table_row_0.parentElement.style.display = "table-row";
    table_row_0.innerHTML = links[0].concat(links[1]).concat(links[11]).concat(links[12]).join(POPUP_SET_SEPARATOR);

    // remaining sets
    for ( let i = 2; i < 11; i++ ) {
        const id = `table-set-row${( i>1 && i<11 ) ? i : 0}`;
        const elm = document.getElementById(id);
        elm.parentElement.style.display = (links[i].length == 0) ? "none" : "table-row";
        elm.innerHTML = links[i].join(POPUP_SET_SEPARATOR);
    }

    showPopup("popup-set-selector");
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


function showExportImagePopup() {
    export_data.pcset = state.pcset.clone();
    export_data.staff.accidental_swap = Array.from(state.staff_accidental_swap);
    loadImageExportPopupSettings();
    showPopup("popup-export-image");
    updateImageExportPopup();
}


function updateImageExportPopup() {
    const popup_export = document.getElementById("popup-export-image");
    const file_type = document.querySelector('input[name="export-file-type"]:checked').value;
    document.getElementById("export-image-download-svg-link").hidden = (file_type != "svg");
    document.getElementById("export-image-download-png-link").hidden = (file_type != "png");
    document.getElementById("span-input-export-file-png-size").hidden = (file_type != "png");
    document.getElementById("export-image-copy-link").hidden = 
        !( ClipboardItem.supports( ( file_type == "svg") ? "image/svg+xml" : "image/png" ) );

    const graphics_type = document.getElementById("expimg-select-type").value;

    for ( const elm of document.querySelectorAll("#popup-export-options *[includetype]") )
        elm.hidden = !(elm.getAttribute("includetype").includes(graphics_type));
    for ( const elm of document.querySelectorAll("#popup-export-options *[excludetype]") )
        elm.hidden = (elm.getAttribute("excludetype").includes(graphics_type));

    const theme = getImageExportTheme();

    function exportStaffPreviewClick(elm, type, index) {
        if ( type == "note" && ![2,7,9].includes(index) ) {
            elm.style.cursor = "pointer";
            elm.style.pointerEvents = "bounding-box";
            elm.setAttribute("onclick", `exportStaffNoteClick(${index})`);
        }
    }
    
    let preview;
    switch ( graphics_type ) {
        case "clockface-set": preview = makeClockfaceSvgFromParams(theme); break;
        case "clockface-intervals": preview = makeClockfaceIntervalsSvgFromParams(theme); break;
        case "ruler-set": preview = makeRulerSvgFromParams(theme); break;
        case "staff-set": preview = makeStaffSvgFromParams(theme, exportStaffPreviewClick); break;
    }
    preview.svg.setAttribute("width", "100%");
    preview.svg.setAttribute("height", "100%");
    preview.svg.setAttribute("max-width", "100%");
    preview.svg.setAttribute("max-height", "100%");
    const div_preview = document.getElementById("popup-export-preview");
    div_preview.style.backgroundColor = ( GRAPHICS_THEMES[theme].bg_type == "dark" )
        ? "var(--bg-dark)" : "var(--bg-light)"
    div_preview.setHTMLUnsafe(preview.svg.outerHTML);
    saveImageExportPopupSettings();
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
    updateImageExportPopup();
}


function exportStaffNoteClick(pc) {
    export_data.staff.accidental_swap[pc] = !export_data.staff.accidental_swap[pc];
    updateImageExportPopup();
}


function loadImageExportPopupSettings() {
    document.getElementById("chk-export-note-names").checked = config_export_image.readBool("note-names", config.note_names);
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


function saveImageExportPopupSettings() {
    config_export_image.writeBool("note-names", document.getElementById("chk-export-note-names").checked);
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
            fifths: document.getElementById("chk-export-fifths").checked,
            scale: parseFloat(document.getElementById("expimg-scale").value),
            stroke_width: parseFloat(document.getElementById("expimg-stroke").value),
            intervals: interval_classes,
        },
        theme
    );
}

function makeRulerSvgFromParams(theme) {
    return new StaticRulerPcSetView(
        export_data.pcset.normal, 
        {
            note_names: document.getElementById("chk-export-note-names").checked,
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
            fn: ( callback ) ? callback : null
        },
        theme
    );
}

function downloadImage(type) {
    const graphics_type = document.getElementById("expimg-select-type").value;
    const theme = getImageExportTheme();
    let svg;
    switch ( graphics_type ) {
        case "clockface-set"      : svg = makeClockfaceSvgFromParams(theme); break;
        case "clockface-intervals": svg = makeClockfaceIntervalsSvgFromParams(theme); break;
        case "ruler-set"          : svg = makeRulerSvgFromParams(theme); break;
        case "staff-set"          : svg = makeStaffSvgFromParams(theme); break;
    }
    const image_size = document.getElementById("input-export-file-png-size").value;
    switch ( type ) {
        case "svg": svg.downloadSvg(); break;
        case "png": svg.downloadPng(image_size); break;
    }
}

function copyImageToClipboard() {
    const type = document.querySelector('input[name="export-file-type"]:checked').value;
    const graphics_type = document.getElementById("expimg-select-type").value;
    const theme = getImageExportTheme();
    let svg;
    switch ( graphics_type ) {
        case "clockface-set"      : svg = makeClockfaceSvgFromParams(theme); break;
        case "clockface-intervals": svg = makeClockfaceIntervalsSvgFromParams(theme); break;
        case "ruler-set"          : svg = makeRulerSvgFromParams(theme); break;
        case "staff-set"          : svg = makeStaffSvgFromParams(theme); break;
    }
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

function showPopup(id) {
    const popup_elm = document.getElementById(id);
    popup_elm.addEventListener("close", (e) => {
        e.currentTarget.style.removeProperty("width");
        e.currentTarget.style.removeProperty("height");
    });
    popup_elm.showModal();
}

function hidePopup(id) {
    const popup_elm = document.getElementById(id);
    popup_elm.close();
}

function hideAllPopups() {
    for ( let popup of document.querySelectorAll(".popup-container") )
        hidePopup(popup.id);
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
            hidePopup(this.id);
    }
}

// Make all popups close when clicked outside them
for ( const dg of document.querySelectorAll("dialog.popup-container") ) {
    dg.addEventListener("click", handleDialogClick, { passive: true });
}
