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

const VERSION = "2024-10-22";

const config_storage = new LocalStorageHandler("pcsetviz");
const config_visible_data = new LocalStorageHandler("pcsetviz-visible-data");
const config_export_image = new LocalStorageHandler("pcsetviz-export-image");

const input_main = document.getElementById("input-main");

const SET_FORMATS = ["short-ab","short-te","numbers","notes-sharps","notes-flats"];
const VECTOR_FORMATS = ["short", "long"];
const INVERSION_FORMATS = ["In", "TnI"];
const STAFF_CLEFS = ["G2", "C3", "C4", "F4"];

const config = {
    last_set: "",
    note_names: false,
    polygon: true,
    intervals: true,
    symmetry_axes: false,
    fifths: false,
    theme: "auto",
    layout: "svg-first",
    staff_clef: STAFF_CLEFS[0],
    set_format: SET_FORMATS[0],
    vector_format: VECTOR_FORMATS[0],
    inversion_format: INVERSION_FORMATS[0],
}

class DataRow {
    element; id; label; default;

    constructor(element) {
        this.element = element;
        this.id = element.id;
        const text = element.firstElementChild.textContent;
        this.label = text.substring(0, text.indexOf(":"));
        this.default = !element.hasAttribute("hidden");
    }

    get visible() { return !(this.hidden); }
    get hidden() { return (this.element.hasAttribute("hidden")); }
    set visible(value) { if ( value != this.visible ) this.toggle(); }
    set hidden(value) { if ( value != this.hidden ) this.toggle(); }
    toggle() { this.element.toggleAttribute("hidden"); }
    show() { this.visible = true; }
    hide() { this.hidden = true; }
}

var data_rows = [];

var state = {
    pcset: new PcSet(),
    polygon: [],
    axes: [],
    last_op: null,
    undone_op: null,
    history_index: 0,
    staff_accidental_swap: Array(12).fill(false),
    ruler: {
        start: 0
    }
}

var string_data = new Object();



function copyToClipboard(s) {
    navigator.clipboard.writeText(s);
}


function textOrDash(s) {
    if (s == "")
        return "-";
    return s;
}


/**
 * Creates a hyperlink (anchor) to a pitch-class set.
 * @param {PcSet} pcset 
 * @param {Object} options An object that accepts the following properties:
 *      * _op_ : a 2-array where the first element represents the operation 
 *          type ('T', 'I', 'M' etc.), and the second is the index of the
 *          operation;
 *      * _text_ : a string containing the text to be printed; if ommitted,
 *          the set will be printed.
 * @returns {String}
 */
function pcsetHyperlink(pcset, options = {}) {
    const tx = (options.text) ? options.text : htmlEscape(pcset.toString(config.set_format, true));
    let anchor;
    if ( pcset.isEqualTo(state.pcset) )
        anchor = `<span class="setfont same-set">${tx}</span>`;
    else {
        const ss = pcset.toString("short-ab", false);
        const js = (options.op) ? `javascript:goto('${ss}', ['${options.op[0]}',${options.op[1]}])`: `javascript:goto('${ss}')`;
        anchor = makeAnchorStr(js, { text: tx, classes: ["setfont"] });
    }
    return ( options.copy ) ? [anchor, copyLink(tx)].join(" ") : anchor;
}


function copyLink(s) {
    return "<small>(" + makeAnchorStr(`javascript:copyToClipboard('${s}')`, {text:"copy"}) + ")</small>";
    //return `<small>(<a href="javascript:copyToClipboard('${s}')">copy</a>)</small>`;
}


function strWithCopyLink(s, cs = null) {
    return htmlEscape(s) + " " + copyLink( (cs) ? cs : s );
}


function pushSetToHistory() {
    const s = state.pcset.toString("short-ab", false);
    window.history.pushState([s,state.last_op,++state.history_index], document.title, 
                             `${window.location.pathname}?set=${s}`);
    config.last_set = s;
    config_storage.writeString("last-set", s);
}


/**
 * Update visualization and table with given PcSet object.
 * @param {PcSet} pcset A _PcSet_ object.
 */
function showPcset(options = {}) {
    
    if ( !options.no_history ) pushSetToHistory();

    const normal = state.pcset.normal;
    const reduced = normal.reduced;
    const prime = reduced.prime;
    //const inversion = normal.invert();
    //const inversion_reduced = inversion.reduced;
    const complement = normal.complement;
    const complement_prime = complement.prime;
    const zcorrespondent = prime.zcorrespondent;
    const icvector = state.pcset.icvector();
    const ctvector = state.pcset.ctvector();
    const transpositions = state.pcset.transpositions_unique(false);
    const ctts = state.pcset.ctts_unique(false);
    const ctis = state.pcset.ctis_unique();
    const rotations = state.pcset.rotations(true).map((x) => x[1]);
    const inversions = state.pcset.inversions_unique();
    const inversional_symmetries = state.pcset.inversionally_symmetric_sets();
    const transpositional_symmetries = state.pcset.transpositionally_symmetric_sets(false);
    const multiples = state.pcset.multiples_unique();

    state.axes = state.pcset.inversional_symmetry_axes();

    function checkmarkIf(cond) {
        if (cond) return "<small>✔</small> ";
        return "";
    }

    function addEquivIf(cond, s) {
        if (cond) return "&nbsp;=&nbsp;" + s;
        return "";
    }

    document.getElementById("normal-form").setHTMLUnsafe(
        checkmarkIf(state.pcset.isEqualTo(normal)) + pcsetHyperlink(normal, {copy: true})
    );

    // document.getElementById("reduced-form").setHTMLUnsafe(
    //     checkmarkIf(state.pcset.isEqualTo(reduced)) + pcsetHyperlink(reduced, {copy: true, op: ["T", 12-normal.head]})
    //     + addEquivIf(!state.pcset.isEqualTo(reduced), `T<sub>${12-normal.head}</sub>`)
    // );

    document.getElementById("prime-form").setHTMLUnsafe(
        checkmarkIf(state.pcset.isEqualTo(prime)) + pcsetHyperlink(prime, {copy: true})
    );

    document.getElementById("ic-vector").setHTMLUnsafe(strWithCopyLink(
        (config.vector_format == "short") ? icvector.str_hex(true) : icvector.str_numbers(true)
    ));

    document.getElementById("ct-vector").setHTMLUnsafe(strWithCopyLink(
        (config.vector_format == "short") ? ctvector.str_hex(true) : ctvector.str_numbers(true)
    ));

    document.getElementById("complement").setHTMLUnsafe(
        pcsetHyperlink(complement) 
        + addEquivIf(!complement.isEqualTo(complement_prime), pcsetHyperlink(complement_prime))
        + ` (${complement.forte_name})`
    );

    document.getElementById("zcorrespondent").setHTMLUnsafe(
        (zcorrespondent) ? `${pcsetHyperlink(zcorrespondent)} (${zcorrespondent.forte_name})` : "-"
    );

    operationUpdate();

    document.getElementById("forte-name").setHTMLUnsafe(strWithCopyLink(prime.forte_name));

    document.getElementById("carter-name").setHTMLUnsafe(strWithCopyLink(prime.carter_number.toString()));

    document.getElementById("rotations").setHTMLUnsafe(textOrDash(setCollectionToStrWithLinks(rotations)));
    
    document.getElementById("transpositions").setHTMLUnsafe(textOrDash(setCollectionToStrWithLinks(transpositions, "Tn", " = ")));

    document.getElementById("inversions").setHTMLUnsafe(textOrDash(setCollectionToStrWithLinks(inversions, config.inversion_format, " = ")));
    
    document.getElementById("ctt").setHTMLUnsafe(textOrDash(setCollectionToStrWithLinks(ctts, "Tn", ": ", false)));

    document.querySelector("#row-cti td span").setHTMLUnsafe(
        ( config.inversion_format == "In" ) ? "I<sub>n</sub>" : "T<sub>n</sub>I" );

    document.getElementById("cti").setHTMLUnsafe(textOrDash(setCollectionToStrWithLinks(ctis, config.inversion_format, ": ", false)));
    
    document.getElementById("symmetries").setHTMLUnsafe(textOrDash(
        [setCollectionToStrWithLinks(inversional_symmetries, config.inversion_format, " = "), 
         setCollectionToStrWithLinks(transpositional_symmetries, "Tn", " = ")]
            .filter((s) => s != "").join(", ")
    ));
    
    document.getElementById("multiples").setHTMLUnsafe(textOrDash(setCollectionToStrWithLinks(multiples, "Mn", " = ")));

    //document.getElementById("subsets").setHTMLUnsafe(
    //    `Show <a href="javascript:showSubsets()">all subsets</a> | <a href="javascript:showSubsetsPrimes()">prime subsets</a>`
    //);

    document.getElementById("descriptive-name").setHTMLUnsafe(textOrDash(pcsetGetDescriptiveNames(reduced).join(", ")));


    // Hexacordal combinatorials

    const combs = normal.hexachordalCombinatorials();
    let comb_count = 0;
    function getCombinatorialsStr(combs, type_str) {
        if ( combs.length == 0) return '';
        comb_count += 1;
        return `${type_str}<sub>${combs.join(',')}</sub>`;
    }
    let combs_str = [
        getCombinatorialsStr(combs.i, 'I'),
        getCombinatorialsStr(combs.p, 'P'),
        getCombinatorialsStr(combs.ri, 'RI'),
        getCombinatorialsStr(combs.r, 'R')
    ].filter( (s) => s ).join(' ');

    // Collect set features

    const features = [];
    //features.push([
    //    "Null set","Singleton","Dyad","Trichord","Tetrachord","Pentachord","Hexachord","Heptachord",
    //    "Octachord","Nonachord","Decachord","Undecachord","Dodechachord"][state.pcset.size]);
    if ( icvector.count_value(1) == 6 ) features.push("All-interval");
    if ( inversional_symmetries.length > 0 ) features.push("Mirror");
    if ( zcorrespondent ) features.push("Z-set");
    if ( comb_count > 0 ) features.push(( comb_count >= 3 ? "All&#8209;combinatorial&nbsp;(" : "Combinatorial&nbsp;(" ) + combs_str + ")");
    document.getElementById("features").setHTMLUnsafe(textOrDash(features.join(", ")));

    // ruler views

    function adaptRulerView(elm, type, index) {
        if ( type == "pc" ) {
            elm.style.cursor = "pointer";
            elm.setAttribute("onclick", `togglePcs([${index}])`);
        }
    }

    const ruler_view = new StaticRulerPcSetView(
        state.pcset, 
        { scale: 1, start: state.ruler.start, note_names: config.note_names, fn: adaptRulerView }, 
        (getCurrentTheme() == "dark") ? "basic-dark" : "basic-light"
    );
    document.getElementById("ruler-view").setHTMLUnsafe(ruler_view.svg.outerHTML);

    // staff view

    function adaptStaffView(elm, type, index) {
        switch ( type ) {
            case "clef":
                elm.style.cursor = "pointer";
                elm.style.pointerEvents = "bounding-box";
                elm.setAttribute("onclick", "staffClefClick()");
                break;
            case "note":
                elm.style.cursor = "pointer";
                elm.style.pointerEvents = "bounding-box";
                elm.setAttribute("onclick", `staffNoteClick(${index})`);
                break;
        }
    }

    function reduceSwappedAccidentalsCallback(a, x, i, s) {
        if ( x ) {
            if ( state.pcset.has(i) )
                a.push(i);
            else
                s[i] = false;
        }
        return a;
    }

    const scale = MusicalScale.fromPcset(state.pcset);

    const staff_view = new StaticStaffPcSetView(
        scale, 
        { 
            scale: 0.2, 
            clef: config.staff_clef,
            accidental_swap: state.staff_accidental_swap.reduce(reduceSwappedAccidentalsCallback, []),
            fn: adaptStaffView
        },
        (getCurrentTheme() == "dark") ? "basic-dark" : "basic-light"
    );
    document.getElementById("staff-view").setHTMLUnsafe(staff_view.svg.outerHTML);

    drawVisualization(options);

}


function operationUpdate(reset = false) {
    const op = document.getElementById("operation-selector").value;
    const index_element = document.getElementById("operation-index");
    const previous = parseInt(index_element.getAttribute("previous-value"));
    let index = parseInt(index_element.value);
    switch ( op ) {
        case "Rn":
            index_element.setAttribute("max", state.pcset.size);
            index_element.setAttribute("min", -state.pcset.size);
            if ( reset ) index = 1;
            if ( index == 0 ) index = -Math.sign(previous);
            if ( Math.abs(index) >= state.pcset.size ) index = 0;
            break;
        case "Tn":
            index_element.setAttribute("max", 12);
            index_element.setAttribute("min", -12);
            if ( reset ) index = 1;
            if ( index == 0 ) index = -Math.sign(previous);
            if ( Math.abs(index) >= 12 ) index = Math.sign(index);
            break;
        default:
            index_element.setAttribute("max", 12);
            index_element.setAttribute("min", -1);
            if ( reset || index >= 12 ) index = 0;
            if ( index < 0 ) index += 12;
    }
    index_element.value = index.toString();
    index_element.setAttribute("previous-value", index.toString());

    let result;
    switch ( op ) {
        case "Rn": result = state.pcset.shift(index); break;
        case "Tn": result = state.pcset.transpose(index); break;
        case "In": result = state.pcset.invert(index); break;
        case "Mn": result = state.pcset.multiply(index); break;
        default: result = state.pcset;
    }
    document.getElementById("operation-result").setHTMLUnsafe(pcsetHyperlink(result, {op: [op,index]}));
}


function pcsetRotate(amount) {
    state.pcset = state.pcset.shift(amount);
    input_main.value = state.pcset.toString(config.set_format, false);
    showPcset({ no_history: false, keep_polygon: true });
}


function rulerShift(amount) {
    state.ruler.start += amount;
    while ( state.ruler.start > 11 ) state.ruler.start -= 12;
    while ( state.ruler.start < 0  ) state.ruler.start += 12;
    showPcset({ no_history: false, keep_polygon: true });
}


function staffClefClick() {
    config.staff_clef = nextOf(config.staff_clef, STAFF_CLEFS);
    saveConfig();
    showPcset({ no_history: true, keep_polygon: true });
}


function staffNoteClick(pc) {
    state.staff_accidental_swap[pc] = !state.staff_accidental_swap[pc];
    showPcset({ no_history: true, keep_polygon: true });
}


function showSubsets() {
    const subsets_element = document.getElementById("subsets");
    subsets_element.setHTMLUnsafe("Computing subsets...");
    const clone = state.pcset.clone();
    const subsets = clone.subsets();
    if ( clone.isEqualTo(state.pcset) )
        subsets_element.setHTMLUnsafe(textOrDash(setCollectionToStrWithLinks(subsets)));
}


function showSubsetsPrimes() {
    const subsets_element = document.getElementById("subsets");
    subsets_element.setHTMLUnsafe("Computing subsets...");
    const clone = state.pcset.clone();
    const subsets = clone.prime_subsets();
    if ( clone.isEqualTo(state.pcset) )
        subsets_element.setHTMLUnsafe(textOrDash(setCollectionToStrWithLinks(subsets)));
}


function pcsetGetDescriptiveNames(pcset) {
    if ( "sets" in string_data ) {
        let zero_set = pcset.reduced.toString("short-ab", true);
        if ( zero_set in string_data["sets"] && "names" in string_data["sets"][zero_set] )
            return string_data["sets"][zero_set]["names"];
    }
    return [];
}


function setCollectionToStrWithLinks(sets, op = null, sep = " = ", include_op_in_link = true) {
    if ( op ) {
        let strings = [];
        for ( const item of sets ) {
            const ranges = [];
            let start = item[0][0];
            for ( const pair of pairwise(item[0], true) ) {
                if ( pair[1] != pair[0] + 1 ) {
                    if ( pair[0] == start )
                        ranges.push(start.toString());
                    else if ( pair[0] == start + 1 )
                        ranges.push([start,pair[0]].join(','))
                    else
                        ranges.push([start,pair[0]].join('-'))
                    start = pair[1];
                }
            }
            if ( item[0].length > 1 ) item[1] = item[1].normal;
            strings.push(
                `${op.replace('n', "<sub>" + ranges.join(",") + "</sub>")}${sep.replaceAll(' ',"&nbsp;")}${
                    include_op_in_link ? pcsetHyperlink(item[1], { op: [op,item[0][0]] }) : pcsetHyperlink(item[1])}`
            )
        }
        return strings.join(", ");
    } else {
        return sets.map( (item) => pcsetHyperlink(item) ).join(", ");
    }
}


function goto(s, op = null, push_to_history = true) {
    state.pcset = new PcSet(s);
    state.last_op = op;
    input_main.value = state.pcset.toString(config.set_format, false);
    typeof(hideAllPopups) === typeof(Function) && hideAllPopups();
    showPcset({ no_history: !push_to_history });
}


function onChange() {
    updateConfigFromInterface();
    showPcset();
}


function onInput() {
    state.pcset = new PcSet(input_main.value);
    state.last_op = null;
    showPcset();
}


function togglePcs(pc_array) {
    for ( let pc of pc_array )
        state.pcset.toggle(pc);
    state.last_op = null;
    input_main.value = state.pcset.normal.toString(config.set_format, false);
    showPcset();
}


function historyEventHandler(evt) {
    if ( !evt.state ) return;
    const seq = evt.state[0];
    let op;
    if ( evt.state[2] == state.history_index-1 ) {
        // Going back
        op = ( state.undone_op )
            ? state.undone_op : state.last_op;
        if ( op ) op[1] *= -1;
        state.undone_op = evt.state[1];
    } else if ( evt.state[2] == state.history_index+1 ) {
        // Going forward
        op = evt.state[1];
        state.undone_op = null;
    } else {
        op = null;
        state.undone_op = null;
    }
    goto(seq, op, false);
    state.history_index = evt.state[2];
}


async function fetchDataFiles(datafiles) {
    for ( const datafile of datafiles ) {
        const data_fetch_response = await fetch(datafile);
        if ( ! data_fetch_response.ok )
            throw new Error(`Could not fetch file: '${datafile}'`);
        const new_data = await data_fetch_response.json();
        mergeObjects(new_data, string_data);
        if ( Object.hasOwn(string_data, "sets") )
            document.querySelector("#row-descriptive-name a").removeAttribute("hidden");
        updateInterfaceFromConfig();
        showPcset({ no_history: true, keep_polygon: true });
    }
}


function collectDataRows() {
    data_rows = [];
    const rows = document.getElementById("data-table-body").children;
    for ( let row of rows )
        if ( !(row.hasAttribute("always-visible")) && !(row.hasAttribute("disabled")) )
            data_rows.push(new DataRow(row));
}

function populatePopupConfigVisibleData() {
    let checkboxes = [];
    for ( let row of data_rows ) {
        let label = row.label;
        label.replaceAll(" ", "&nbsp;");
        let checkbox_id = "chk-visible-data-" + label.toLowerCase();
        checkbox_id.replaceAll(" ", "-");
        checkboxes.push(`<span><input id="${checkbox_id}" type="checkbox" target="${row.id}" onchange="toggleVisibleData('${checkbox_id}')">`+
                        `&nbsp;<label for="${checkbox_id}">${label}</label></span>`)
    }
    document.getElementById("visible-data-checkboxes-area").setHTMLUnsafe(checkboxes.join(" "));
}

function toggleVisibleData(id, checked = null) {
    const checkbox = document.getElementById(id);
    const target_id = checkbox.getAttribute("target");
    const target_elm = document.getElementById(target_id);
    if ( checked == null )
        target_elm.toggleAttribute("hidden");
    else
        target_elm.setAttribute("hidden", !checked);
    saveConfig();
}

function updateInterfaceFromConfig() {
    document.querySelector(`input[name="div-layout"][value="${config.layout}"]`).checked = true;
    document.querySelector(`input[name="set-format"][value="${config.set_format}"]`).checked = true;
    document.querySelector(`input[name="vector-format"][value="${config.vector_format}"]`).checked = true;
    document.querySelector(`input[name="inversion-format"][value="${config.inversion_format}"]`).checked = true;
    document.getElementById("chk-note-names").checked = config.note_names;
    document.getElementById("chk-polygon").checked = config.polygon;
    document.getElementById("chk-sym-axes").checked = config.symmetry_axes;
    document.querySelector(`input[name="theme"][value="${config.theme}"]`).checked = true;
    updateColorTheme();
    updateLayout();
}

function updateConfigFromInterface() {
    config.layout = document.querySelector('input[name="div-layout"]:checked').value;
    const new_set_format = document.querySelector(`input[name="set-format"]:checked`).value;
    if ( new_set_format != config.set_format )
        input_main.value = state.pcset.toString(new_set_format, false);
    config.set_format = new_set_format;
    config.vector_format = document.querySelector(`input[name="vector-format"]:checked`).value;
    config.inversion_format = document.querySelector(`input[name="inversion-format"]:checked`).value;
    config.note_names = document.getElementById("chk-note-names").checked;
    config.polygon = document.getElementById("chk-polygon").checked;
    config.symmetry_axes = document.getElementById("chk-sym-axes").checked;
    const fifths = document.getElementById("chk-fifths").checked;
    if ( config.fifths != fifths ) {
        config.fifths = fifths;
        createSvg(document.getElementById("visualization-svg"));
    }
    config.theme = document.querySelector('input[name="theme"]:checked').value;
    updateColorTheme();
    updateLayout();
    saveConfig();
}

function readConfig() {
    config.layout = config_storage.readString("layout", "svg-first");
    config.set_format = config_storage.readString("set-format", SET_FORMATS[0]);
    config.vector_format = config_storage.readString("vector-format", VECTOR_FORMATS[0]);
    config.inversion_format = config_storage.readString("inversion-format", INVERSION_FORMATS[0]);
    config.last_set = config_storage.readString("last-set", "");
    config.note_names = config_storage.readBool("note_names", false);
    config.polygon = config_storage.readBool("polygon", true);
    config.symmetry_axes = config_storage.readBool("symmetry-axes", false);
    config.staff_clef = config_storage.readString("staff-clef", STAFF_CLEFS[0]);
    const fifths = config_storage.readBool("fifths", false);
    if ( config.fifths != fifths ) {
        config.fifths = fifths;
        createSvg(document.getElementById("visualization-svg"));
    }
    config.theme = config_storage.readString("theme", "auto");
    for ( let row of data_rows )
        row.visible = config_visible_data.readBool(row.id, row.visible);
    updateInterfaceFromConfig();
}

function saveConfig() {
    config_storage.writeString("layout", config.layout);
    config_storage.writeString("set-format", config.set_format);
    config_storage.writeString("vector-format", config.vector_format);
    config_storage.writeString("inversion-format", config.inversion_format);
    config_storage.writeBool("note_names", config.note_names);
    config_storage.writeBool("polygon", config.polygon);
    config_storage.writeBool("symmetry-axes", config.symmetry_axes);
    config_storage.writeBool("fifths", config.fifths);
    config_storage.writeString("theme", config.theme);
    config_storage.writeString("staff-clef", config.staff_clef);
    for ( let row of data_rows )
        config_visible_data.writeBool(row.id, row.visible);
}


function on_system_theme_change_event_handler(event) {
    updateColorTheme();
}

function getCurrentTheme() {
    if ( config.theme == "auto" ) {
        if ( window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches )
            return "dark";
        else
            return "light";
    }
    return config.theme;
}

function updateColorTheme() {
    document.documentElement.setAttribute("theme", getCurrentTheme());
}

function updateLayout() {
    const main_area = document.getElementById("main-area");
    const svg_area = document.getElementById("visualization-area");
    const data_area = document.getElementById("data-area");
    if ( config.layout == "data-first" ) {
        main_area.insertBefore(data_area, svg_area);
    } else {
        main_area.insertBefore(svg_area, data_area);
    }
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
    input_main.value = state.pcset.toString(config.set_format, false);
    showPcset({ no_history: true, keep_polygon: true });
}

function handleKeyboardShortcut(ev) {
    if ( ev.repeating ) return;
    let comb = [];
    if ( ev.ctrlKey  ) comb.push("ctrl");
    if ( ev.altKey   ) comb.push("alt");
    if ( ev.shiftKey ) comb.push("shift");
    comb.push(ev.key.toLowerCase());
    const k = comb.join("+");
    switch ( k ) {
        case "alt+n": 
            ev.preventDefault();
            config.note_names = !config.note_names;
            onVisualizationConfigChange(); 
            break;
        case "alt+g": 
            ev.preventDefault();
            config.polygon = !config.polygon;
            onVisualizationConfigChange(); 
            break;
        case "alt+s": 
            ev.preventDefault();
            config.symmetry_axes = !config.symmetry_axes;
            onVisualizationConfigChange(); 
            break;
        case "alt+f":
            ev.preventDefault();
            config.set_format = nextOf(config.set_format, SET_FORMATS);
            onGeneralConfigChange(); 
            break;
        case "alt+v":
            ev.preventDefault();
            config.vector_format = nextOf(config.vector_format, VECTOR_FORMATS);
            onGeneralConfigChange(); 
            break;
        case "alt+i":
            ev.preventDefault();
            config.inversion_format = nextOf(config.inversion_format, INVERSION_FORMATS);
            onGeneralConfigChange(); 
            break;
        case "alt+5":
            ev.preventDefault();
            config.fifths = !config.fifths;
            createSvg(document.getElementById("visualization-svg"));
            onVisualizationConfigChange(); 
            break;
        // case "escape":
        //     hideAllPopups();
        //     break;
    }
}

function enableKeyboardShortcuts() {
    window.addEventListener("keydown", handleKeyboardShortcut);
    //document.addEventListener("keydown", handleKeyboardShortcut);
}


collectDataRows();
populatePopupConfigVisibleData();
readConfig();

addEventListener("popstate", historyEventHandler);
window.matchMedia('(prefers-color-scheme: dark)').addEventListener("change", on_system_theme_change_event_handler);

fetchDataFiles(["data/en.json"]);
createSvg(document.getElementById("visualization-svg"));
enableKeyboardShortcuts();

{
    const url_param_set = getUrlQueryValue("set");
    if ( url_param_set ) {
        goto(url_param_set, null, false);
    } else {
        goto(config.last_set, null, false);
        document.location.href += `?set=${config.last_set}`
    }

}
