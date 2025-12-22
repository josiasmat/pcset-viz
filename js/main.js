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

const VERSION = "2025-01-21";

const config_storage = new LocalStorageHandler("pcsetviz");
const config_visible_data = new LocalStorageHandler("pcsetviz-visible-data");
const config_export_image = new LocalStorageHandler("pcsetviz-export-image");

const input_main = document.getElementById("input-main");

const SET_FORMATS = ["short-ab","short-te","numbers","notes-sharps","notes-flats"];
const SET_BRACKETS = ["[]","{}","()"];
const VECTOR_FORMATS = ["short", "long"];
const INVERSION_FORMATS = ["In", "TnI"];
const STAFF_CLEFS = ["G2", "C3", "C4", "F4"];

const config = {
    last_set: "",
    prime_unique: true,
    note_names: false,
    polygon: true,
    intervals: true,
    symmetry_axes: false,
    fifths: false,
    theme: "auto",
    layout: "svg-first",
    staff_clef: STAFF_CLEFS[0],
    set_format: SET_FORMATS[0],
    set_brackets: SET_BRACKETS[0],
    vector_format: VECTOR_FORMATS[0],
    inversion_format: INVERSION_FORMATS[0],
    sound_midi: false,
    sound_toggle: false
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

var data_cells = {
    ruler_view: document.getElementById("ruler-view"),
    staff_view: document.getElementById("staff-view"),
    binary_value: document.getElementById("binary-value"),
    normal_form: document.getElementById("normal-form"),
    prime_form: document.getElementById("prime-form"),
    forte_name: document.getElementById("forte-name"),
    carter_name: document.getElementById("carter-name"),
    descriptive_name: document.getElementById("descriptive-name"),
    ic_vector: document.getElementById("ic-vector"),
    ct_vector: document.getElementById("ct-vector"),
    spectra: document.getElementById("spectra"),
    complement: document.getElementById("complement"),
    zcorrespondent: document.getElementById("zcorrespondent"),
    sumclass: document.getElementById("sumclass"),
    features: document.getElementById("features"),
    rotations: document.getElementById("rotations"),
    symmetries: document.getElementById("symmetries"),
    combinatorials: document.getElementById("combinatorials"),
    transpositions: document.getElementById("transpositions"),
    ctt: document.getElementById("ctt"),
    inversions: document.getElementById("inversions"),
    cti: document.getElementById("cti"),
    cti_inv_label: document.getElementById("cti-inversion-label"),
    multiplications: document.getElementById("multiples"),
    subsets: document.getElementById("subsets"),
    operation: {
        selector: document.getElementById("operation-selector"),
        index: document.getElementById("operation-index"),
        result: document.getElementById("operation-result")
    }
}

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

var history_update_timer = null;

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
 *      * _enable_ : set it to _true_ to make a link even if the set is
 *          equal to the current set.
 * @returns {String}
 */
function pcsetHyperlink(pcset, options = {}) {
    const tx = options.text ?? htmlEscape(
        (options.normalize) ? pcset.normal.toString(config.set_format, config.set_brackets) : pcset.toString(config.set_format, config.set_brackets)
    );
    let anchor;
    if ( pcset.isEqualTo(state.pcset) && !options.enable )
        anchor = `<span class="setfont same-set">${tx}</span>`;
    else {
        const ss = pcset.toString("short-ab", null);
        const js = (options.op) ? `javascript:goto('${ss}', ['${options.op[0]}',${options.op[1]}])`: `javascript:goto('${ss}')`;
        anchor = makeAnchorStr(js, { text: tx, classes: ["setfont"] });
    }
    return ( options.copy ) ? [anchor, copyLink(tx)].join(" ") : anchor;
}


function copyLink(s) {
    return "<small>(" + makeAnchorStr(`javascript:copyToClipboard('${s}')`, {text:"copy"}) + ")</small>";
}


function strWithCopyLink(s, cs = null) {
    return htmlEscape(s) + " " + copyLink( cs ?? s );
}


function pushSetToHistory(timeout = 0) {
    if ( history_update_timer ) clearTimeout(history_update_timer);
    history_update_timer = setTimeout(() => { 
            const s = state.pcset.toString("short-ab", null);
            if ( s !== window.history.state[0] )
                window.history.pushState([s,state.last_op,++state.history_index], document.title, 
                    `${window.location.pathname}?set=${s}`);
            config.last_set = s;
            config_storage.writeString("last-set", s);
            history_update_timer = null;
        }, timeout);
}


/**
 * Update visualization and table.
 * @param {Objects} options An object accepting the following properties:
 *      * _no_history_ : set to true to prevent the set from being pushed
 *          into the history stack.
 *      * _history_delay_ : set it to a value in milliseconds to delay 
 *          pushing the new set to the history stack.
 *      * _keep_polygon_ : set to true to prevent changing the polygon.
 *      * _polygon_delay_ : set it to a value in milliseconds to delay
 *          the display of the new polygon.
 *      * _keep_input_ : set to true to prevent changing the input control.
 */
function showPcset(options = {}) {

    if ( !options.no_history )
        pushSetToHistory(options.history_delay ?? 0);

    if ( !options.keep_input )
        input_main.value = state.pcset.toString(config.set_format, config.set_brackets);
        
    const normal = state.pcset.normal;
    const reduced = normal.reduced;
    const prime = reduced.prime;
    const prime_op = prime.findTransformFrom(state.pcset);
    const prime_inverse = prime.invert().reduced;
    const prime_inverse_op = prime_inverse.findTransformFrom(state.pcset);
    const complement = normal.complement;
    const complement_prime = complement.prime;
    const zcorrespondent = prime.zcorrespondent;
    const icvector = state.pcset.icvector();
    const ctvector = state.pcset.ctvector();
    const transpositions = state.pcset.getTranspositionsUnique(false);
    const ctts = state.pcset.getCttsUnique(false);
    const ctis = state.pcset.getCtisUnique();
    const rotations = normal.getRotations(true).map((x) => x[1]);
    const inversions = state.pcset.getInversionsUnique();
    const inversional_symmetries = state.pcset.getInversionallySymmetricSets();
    const transpositional_symmetries = state.pcset.getTranspositionallyEquivalentSets(false);
    const multiples = state.pcset.getMultiplesUnique();

    const is_mirror = reduced.isMirror();

    state.axes = state.pcset.getInversionalSymmetryAxes();

    function checkmarkIf(cond) {
        return (cond) ? "<small>✔</small> " : "";
    }

    function addEquivIf(cond, s) {
        return (cond) ? "&nbsp;=&nbsp;" + s : "";
    }

    data_cells.binary_value.setHTMLUnsafe(
        `${strWithCopyLink(toBinary(state.pcset.binary_value, 12))} = ${strWithCopyLink(state.pcset.binary_value.toString())}`
    );

    data_cells.normal_form.setHTMLUnsafe(
        checkmarkIf(state.pcset.isEqualTo(normal)) + pcsetHyperlink(normal, {copy: true}));

    if ( prime.hasDistinctInverse() ) {
        data_cells.prime_form.setHTMLUnsafe(
            checkmarkIf(state.pcset.isEqualTo(prime)) 
            + pcsetHyperlink(prime, {op: prime_op, copy: true})
            + " · Inverse: " 
            + checkmarkIf(state.pcset.isEqualTo(prime_inverse)) 
            + pcsetHyperlink(prime_inverse, {op: prime_inverse_op, copy: true}) );
    } else {
        data_cells.prime_form.setHTMLUnsafe( 
            checkmarkIf(state.pcset.isEqualTo(prime)) 
            + pcsetHyperlink(prime, {op: prime_op, copy: true})
        );
    }

    data_cells.ic_vector.setHTMLUnsafe(strWithCopyLink(
        (config.vector_format == "short") ? icvector.str_hex(true) : icvector.str_numbers(true)
    ));

    data_cells.ct_vector.setHTMLUnsafe(strWithCopyLink(
        (config.vector_format == "short") ? ctvector.str_hex(true) : ctvector.str_numbers(true)
    ));

    data_cells.complement.setHTMLUnsafe(
        pcsetHyperlink(complement) 
        + addEquivIf(!complement.isEqualTo(complement_prime), pcsetHyperlink(complement_prime))
        + ` (${config.prime_unique ? complement.forte_name : complement.forte_name_ab})`
    );

    data_cells.zcorrespondent.setHTMLUnsafe(
        (zcorrespondent) ? `${pcsetHyperlink(zcorrespondent)} (${config.prime_unique ? zcorrespondent.forte_name : zcorrespondent.forte_name_ab})` : "-"
    );

    operationUpdate();

    data_cells.forte_name.setHTMLUnsafe(
        strWithCopyLink(config.prime_unique ? normal.forte_name : normal.forte_name_ab));

    data_cells.carter_name.setHTMLUnsafe(
        strWithCopyLink(prime.carter_number.toString()));

    data_cells.sumclass.setHTMLUnsafe(`${state.pcset.sum} ≡ ${state.pcset.sum_class} <small>(mod12)</small>`);

    data_cells.rotations.setHTMLUnsafe(textOrDash(
        setCollectionToLinks(rotations, {normalize: false})));
    
    data_cells.transpositions.setHTMLUnsafe(textOrDash(
        taggedSetCollectionToLinks(transpositions, "Tn")));

    data_cells.inversions.setHTMLUnsafe(textOrDash(
        taggedSetCollectionToLinks(inversions, config.inversion_format)));
    
    data_cells.ctt.setHTMLUnsafe(textOrDash(
        taggedSetCollectionToLinks(ctts, "Tn", {eq: ": "})));

    data_cells.cti_inv_label.setHTMLUnsafe(
        ( config.inversion_format == "In" ) ? "I<sub>n</sub>" : "T<sub>n</sub>I" );

    data_cells.cti.setHTMLUnsafe(textOrDash(
        taggedSetCollectionToLinks(ctis, config.inversion_format, {eq: ": "})));
    
    data_cells.symmetries.setHTMLUnsafe(textOrDash(
        [taggedSetCollectionToLinks(inversional_symmetries, config.inversion_format), 
         taggedSetCollectionToLinks(transpositional_symmetries, "Tn")]
            .filter((s) => s != "").join(", ")
    ));

    data_cells.multiplications.setHTMLUnsafe(textOrDash(
        taggedSetCollectionToLinks(multiples, "Mn")));

    data_cells.descriptive_name.setHTMLUnsafe(textOrDash(
        pcsetGetDescriptiveNames(reduced).join(", ")));

    // Spectra

    const spectra = PcSetSpectra.fromPcset(prime);
    let spectra_str = [];
    if ( prime.size > 1 ) {
        for ( let i = 1; i < prime.size; i++ ) {
            spectra_str.push( `‹${i}›&nbsp;=&nbsp;${spectra.toString(i, true)}`);
        }
        const rounded_var = Math.round(spectra.variation*100)/100;
        spectra_str.push(`Variation&nbsp;${(rounded_var == spectra.variation ? '=' : '≈')}&nbsp;${rounded_var.toFixed(2)}`);
    }
    data_cells.spectra.setHTMLUnsafe(textOrDash(spectra_str.join('; ')));

    // Hexacordal combinatorials

    const combs = normal.getHexachordalCombinations();
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

    data_cells.combinatorials.setHTMLUnsafe(textOrDash(combs_str));

    // Collect set features

    const features = [];
    //features.push([
    //    "Null set","Singleton","Dyad","Trichord","Tetrachord","Pentachord","Hexachord","Heptachord",
    //    "Octachord","Nonachord","Decachord","Undecachord","Dodechachord"][state.pcset.size]);
    if ( icvector.count_value(1) == 6 ) features.push(htmlNonBreakingSpaces("All-interval"));
    if ( is_mirror ) features.push("Mirror");
    if ( prime.isMaximallyEven() ) features.push(htmlNonBreakingSpaces("Maximally even"));
    if ( prime.hasMaximalPolygonalArea() ) features.push(htmlNonBreakingSpaces("Maximal area"));
    const proper_scale = prime.isProperScale();
    if ( proper_scale ) features.push(htmlNonBreakingSpaces((proper_scale == 2) ? "Strictly proper scale" : "Proper scale"));
    if ( prime.isDeepScale() ) features.push(htmlNonBreakingSpaces("Deep scale"));
    const generators = prime.getGenerators();
    if ( generators.length > 0 ) features.push(htmlNonBreakingSpaces(`Generated (${integerRangesToStr(generators)})`));
    if ( prime.hasMyhillProperty() ) features.push(htmlNonBreakingSpaces("Myhill's property"));
    if ( zcorrespondent ) features.push("Z-set");
    if ( comb_count > 0 ) features.push(comb_count >= 3 ? "All&#8209;combinatorial" : "Combinatorial");

    data_cells.features.setHTMLUnsafe(textOrDash(features.join(", ")));

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
    data_cells.ruler_view.setHTMLUnsafe(ruler_view.svg.outerHTML);

    // staff view

    function adaptStaffView(elm, type, index) {
        switch ( type ) {
            case "clef":
                elm.style.cursor = "pointer";
                elm.style.pointerEvents = "bounding-box";
                elm.setAttribute("onclick", "staffClefClick()");
                break;
            case "note":
                if ( ![2,7,9].includes(index) ) {
                    elm.style.cursor = "pointer";
                    elm.style.pointerEvents = "bounding-box";
                    elm.setAttribute("onclick", `staffNoteClick(${index})`);
                }
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
    data_cells.staff_view.setHTMLUnsafe(staff_view.svg.outerHTML);

    drawVisualization(options);

}


function operationUpdate(reset = false) {
    const op = data_cells.operation.selector.value;
    const previous = parseInt(data_cells.operation.index.getAttribute("previous-value"));
    let index = parseInt(data_cells.operation.index.value);
    switch ( op ) {
        case "Rn":
            data_cells.operation.index.setAttribute("max", state.pcset.size);
            data_cells.operation.index.setAttribute("min", -state.pcset.size);
            if ( reset ) index = 1;
            if ( index == 0 ) index = -Math.sign(previous);
            if ( Math.abs(index) >= state.pcset.size ) index = 0;
            break;
        case "Tn":
            data_cells.operation.index.setAttribute("max", 12);
            data_cells.operation.index.setAttribute("min", -12);
            if ( reset ) index = 1;
            if ( index == 0 ) index = -Math.sign(previous);
            if ( Math.abs(index) >= 12 ) index = Math.sign(index);
            break;
        default:
            data_cells.operation.index.setAttribute("max", 12);
            data_cells.operation.index.setAttribute("min", -1);
            if ( reset || index >= 12 ) index = 0;
            if ( index < 0 ) index += 12;
    }
    data_cells.operation.index.value = index.toString();
    data_cells.operation.index.setAttribute("previous-value", index.toString());

    let result;
    switch ( op ) {
        case "Rn": result = state.pcset.shifted(index); break;
        case "Tn": result = state.pcset.transpose(index); break;
        case "In": result = state.pcset.invert(index); break;
        case "Mn": result = state.pcset.multiply(index); break;
        default: result = state.pcset;
    }

    data_cells.operation.result.setHTMLUnsafe(
        pcsetHyperlink(result, {op: [op,index], enable: true, normalize: false}));
}


function pcsetRotate(amount) {
    state.pcset.shift(amount);
    input_main.value = state.pcset.toString(config.set_format, config.set_brackets);
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


function pcsetGetDescriptiveNames(pcset) {
    if ( "sets" in string_data ) {
        let zero_set = pcset.reduced.toString("short-ab", PCSET_DEFAULT_BRACKETS);
        if ( zero_set in string_data["sets"] && "names" in string_data["sets"][zero_set] )
            return string_data["sets"][zero_set]["names"];
    }
    return [];
}


/**
 * Construct a string from a collection os sets, with hyperlinks to the sets.
 * For tagged collections, use _taggedSetCollectionToStr()_.
 * @param {PcSet[]} sets - pitch-class sets;
 * @param {Object} options - Accepts the following properties:
 * @param {String} options.sep - separator string, defaults to _", "_;
 * @param {Boolean} options.normalize - normalize set strings; defaults to _true_.
 * @returns {String}
 */
function setCollectionToLinks(sets, options = {}) {
    return sets.map( 
        (item) => pcsetHyperlink(item, options.normalize ?? true) 
    ).join(options.sep ?? ", ");
}


/**
 * Construct a string from a collection os sets, with hyperlinks to the sets.
 * @param {[Number[],PcSet][]} sets - pitch-class sets;
 * @param {String} op - operation string ('Tn','In',...), defaults to _null_;
 * @param {Object} options - Accepts the following properties:
 * @param {String} options.eq - separator between operation and set, defaults to _' = '_;
 * @param {String} options.sep - separator string, defaults to _", "_;
 * @param {Boolean} options.normalize - normalize set strings; defaults to _true_.
 * @returns {String}
 */
function taggedSetCollectionToLinks(sets, op = null, options = {}) { //} op = null, sep = " = ", include_op_in_link = true) {
    let strings = [];
    for ( const item of sets ) {
        const indexes = integerRangesToStr(item[0]);
        if ( item[0].length > 1 ) item[1] = item[1].normal;
        strings.push(
            `${op.replace('n', "<sub>" + indexes + "</sub>")}${(options.eq ?? " = ").replaceAll(' ',"&nbsp;")}${
                op ? pcsetHyperlink(item[1], { op: [op,item[0][0]], normalize: options.normalize ?? true })
                   : pcsetHyperlink(item[1], { normalize: options.normalize ?? true })}`
        )
    }
    return strings.join(options.sep ?? ", ");
}


function goto(set, op = null, options = {}) {
    state.pcset = new PcSet(set);
    state.last_op = op;
    typeof(hideAllDialogs) === typeof(Function) && hideAllDialogs();
    showPcset(options);
}


function onChange(update_config_dialog = false) {
    updateConfigFromInterface();
    if ( update_config_dialog ) updateInterfaceFromConfig();
    showPcset();
}


function onInput() {
    state.pcset = new PcSet(input_main.value);
    state.last_op = null;
    showPcset({keep_input: true});
}


function togglePcs(pc_array) {
    for ( let i = 0; i < pc_array.length; i++ ) {
        const pc = pc_array[i];
        if ( state.pcset.toggle(pc) && config.sound_toggle )
            PitchPlayer.playPitch(pc, 0.3);
    }
    state.last_op = null;
    input_main.value = state.pcset.normal.toString(config.set_format, config.set_brackets);
    showPcset();
}


function playScale() {
    const pitches = state.pcset.toArray();
    const length = pitches.length;
    if ( length != 0 ) {
        const duration = 0.95 - 0.3 * Math.log(length);
        PitchPlayer.playScale(pitches, duration);
    }
}


function historyEventHandler(evt) {
    if ( !evt.state ) return;
    const seq = evt.state[0];
    let op;
    if ( evt.state[2] == state.history_index-1 ) {
        // Going back
        op = state.undone_op ?? state.last_op;
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
    goto(seq, op, {no_history: true});
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

function populateConfigDialogVisibleData() {
    let checkboxes = [];
    for ( let row of data_rows ) {
        let label = row.label;
        label.replaceAll(" ", "&nbsp;");
        const checkbox_id = "chk-visible-data-" + row.id;
        const label_id = checkbox_id + "-label";
        checkboxes.push(`<span><input id="${checkbox_id}" type="checkbox" target="${row.id}" onchange="toggleVisibleData('${checkbox_id}')">`+
                        `&nbsp;<label id="${label_id}" for="${checkbox_id}">${label}</label></span>`)
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
    document.getElementById("radio-setformat-short-ab-label").innerHTML = config.set_brackets[0] + "012…9AB" + config.set_brackets[1];
    document.getElementById("radio-setformat-short-te-label").innerHTML = config.set_brackets[0] + "012…9TE" + config.set_brackets[1];
    document.getElementById("radio-setformat-numbers-label").innerHTML = config.set_brackets[0] + "0,1,2,…,9,10,11" + config.set_brackets[1];
    document.getElementById("radio-setformat-notes-sharps-label").innerHTML = config.set_brackets[0] + "C,C&#9839;,D,…,A,A&#9839;,B" + config.set_brackets[1];
    document.getElementById("radio-setformat-notes-flats-label").innerHTML = config.set_brackets[0] + "C,D&#9837;,D,…,A,B&#9837;,B" + config.set_brackets[1];
    document.getElementById("chk-visible-data-row-cti-label").innerHTML = `Common tones under ${config.inversion_format}`;
    document.querySelector(`input[name="div-layout"][value="${config.layout}"]`).checked = true;
    document.querySelector(`input[name="set-format"][value="${config.set_format}"]`).checked = true;
    document.querySelector(`input[name="set-brackets"][value="${config.set_brackets}"]`).checked = true;
    document.querySelector(`input[name="prime-form"][value="${config.prime_unique.toString()}"]`).checked = true;
    document.querySelector(`input[name="vector-format"][value="${config.vector_format}"]`).checked = true;
    document.querySelector(`input[name="inversion-format"][value="${config.inversion_format}"]`).checked = true;
    document.getElementById("chk-note-names").checked = config.note_names;
    document.getElementById("chk-polygon").checked = config.polygon;
    document.getElementById("chk-sym-axes").checked = config.symmetry_axes;
    document.querySelector(`input[name="theme"][value="${config.theme}"]`).checked = true;
    document.getElementById("chk-sound-midi").checked = config.sound_midi;
    document.getElementById("chk-sound-toggle").checked = config.sound_toggle;
    updateColorTheme();
    updateLayout();
}

function updateConfigFromInterface() {
    config.layout = document.querySelector('input[name="div-layout"]:checked').value;
    const new_set_format = document.querySelector(`input[name="set-format"]:checked`).value;
    if ( new_set_format != config.set_format )
        input_main.value = state.pcset.toString(new_set_format, false);
    config.set_format = new_set_format;
    config.set_brackets = document.querySelector(`input[name="set-brackets"]:checked`).value;
    config.prime_unique = document.getElementById("radio-prime-form-unique").checked;
    config.vector_format = document.querySelector(`input[name="vector-format"]:checked`).value;
    config.inversion_format = document.querySelector(`input[name="inversion-format"]:checked`).value;
    config.note_names = document.getElementById("chk-note-names").checked;
    config.polygon = document.getElementById("chk-polygon").checked;
    config.symmetry_axes = document.getElementById("chk-sym-axes").checked;
    const fifths = document.getElementById("chk-fifths").checked;
    if ( config.fifths != fifths ) {
        config.fifths = fifths;
        createMainClockfaceSvg(document.getElementById("visualization-svg"));
    }
    config.theme = document.querySelector('input[name="theme"]:checked').value;
    config.sound_midi = document.getElementById("chk-sound-midi").checked;
    config.sound_toggle = document.getElementById("chk-sound-toggle").checked;
    updateColorTheme();
    updateLayout();
    saveConfig();
}

function readConfig() {
    config.layout = config_storage.readString("layout", "svg-first");
    config.set_format = config_storage.readString("set-format", SET_FORMATS[0]);
    config.set_brackets = config_storage.readString("set-brackets", SET_BRACKETS[0]);
    config.prime_unique = config_storage.readBool("prime-unique", true);
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
        createMainClockfaceSvg(document.getElementById("visualization-svg"));
    }
    config.theme = config_storage.readString("theme", "auto");
    config.sound_midi = config_storage.readBool("sound-midi", false);
    config.sound_toggle = config_storage.readBool("sound-toggle", false);
    for ( let row of data_rows )
        row.visible = config_visible_data.readBool(row.id, row.visible);
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
    config_storage.writeString("staff-clef", config.staff_clef);
    config_storage.writeBool("sound-midi", config.sound_midi);
    config_storage.writeBool("sound-toggle", config.sound_toggle);
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
    input_main.value = state.pcset.toString(config.set_format, null);
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
            createMainClockfaceSvg(document.getElementById("visualization-svg"));
            onVisualizationConfigChange(); 
            break;
        case "esc":
            midiPanic();
            break;
    }
}

function enableKeyboardShortcuts() {
    window.addEventListener("keydown", handleKeyboardShortcut);
}


// Run at load

collectDataRows();
populateConfigDialogVisibleData();
readConfig();

addEventListener("popstate", historyEventHandler);
window.matchMedia('(prefers-color-scheme: dark)').addEventListener("change", on_system_theme_change_event_handler);

fetchDataFiles(["data/en.json"]);
createMainClockfaceSvg(document.getElementById("visualization-svg"));
enableKeyboardShortcuts();

{
    const url_params = new URLSearchParams(window.parent.location.search);
    if ( url_params.has("set") ) {
        const param_set = url_params.get("set");
        goto(param_set, null, {no_history: true});
        window.history.replaceState([param_set,'',state.history_index], document.title, 
            `${window.location.pathname}?set=${param_set}`);
    } else if ( url_params.has("b") ) {
        const param_b = url_params.get("b");
        let bv = param_b ? parseInt(param_b) : 0;
        if ( !bv ) bv = 0;
        goto(bv, null, {no_history: true});
        window.history.replaceState([bv,'',state.history_index], document.title, 
            `${window.location.pathname}?b=${bv}`);
    } else {
        goto(config.last_set, null, {no_history: true});
        window.history.replaceState([config.last_set,'',state.history_index], document.title, 
            window.location.pathname + (config.last_set ? `?set=${config.last_set}` : ''));
    }
}


for ( const elm of document.querySelectorAll(".icon-search") ) {
    const svg = SvgTools.createRootElement({
        "class": "svg-icon",
        "viewbox": [0, 0, SVG_ICONS.magnifier.w, SVG_ICONS.magnifier.h].join(' ')
    });
    svg.appendChild(
        SvgTools.makePath(SVG_ICONS.magnifier.d, {
            "class": "svg-hyperlink"
        })
    );
    elm.setHTMLUnsafe(svg.outerHTML);
}

