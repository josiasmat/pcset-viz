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


var export_data = {
    pcset: null,
    staff: {
        clef: "G2",
        barline: "",
        accidental_swap: Array(12).fill(false),
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
        !( ClipboardItem?.supports( ( file_type == "svg") ? SVG_MIME : PNG_MIME ) );

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
    try {
        if ( type == "svg" )
            svg.svgToClipboard();
        else {
            const image_size = document.getElementById("input-export-file-png-size").value;
            svg.pngToClipboard(image_size, image_size);
        }
        alert(i18n.get("alert-image-copy-ok", "Image copied to the clipboard!"));
    } catch (e) {
        alert(i18n.getp("alert-image-copy-err", "Unable to copy image to clipboard: %0", [e]));
    }
}
