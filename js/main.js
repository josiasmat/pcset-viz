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
    },
}

var history_update_timer = null;



function textOrDash(s) {
    if (s == "")
        return "-";
    return s;
}


/**
 * Creates a hyperlink (anchor) to a pitch-class set.
 * @param {PcSet} pcset 
 * @param {Object} options An object that accepts the following properties:
 * @param {[String,Number]} object.op - a 2-array where the first element represents 
 *      the operation type ('T', 'I', 'M' etc.), and the second is the index of the
 *      operation;
 * @param {String} object.text - a string containing the text to be printed; if 
 *      ommitted, the set will be printed.
 * @param {Boolean} object.enable - set it to _true_ to make a link even if the set 
 *      is equal to the current set.
 * @param {Boolean} object.strong_correspondence - set it to _true_ to only highlight 
 *      the set if it corresponds exactly (same order) to the state set.
 * @param {Boolean} object.normalize - force pcset to normal form.
 * @returns {String}
 */
function pcsetHyperlink(pcset, options = {}) {
    const tx = options.text ?? htmlEscape(
        (options.normalize) 
            ? pcset.normal.toString(config.set_format, config.set_brackets) 
            : pcset.toString(config.set_format, config.set_brackets)
    );
    let anchor;
    if ( pcset.isEqualTo(state.pcset) && !options.enable )
        anchor = `<span class="setfont same-set">${tx}</span>`;
    else {
        const ss = pcset.toString("short-ab", null);
        const js = (options.op) ? `javascript:goto('${ss}', ['${options.op[0]}',${options.op[1]}])`: `javascript:goto('${ss}')`;
        const cc = ( !options.strong_correspondence && pcset.normal.isEqualTo(state.pcset.normal) )
            ? ["setfont", "similar-set"] : ["setfont"];
        anchor = makeAnchorStr(js, { text: tx, classes: cc });
    }
    return ( options.copy ) ? [anchor, copyLink(tx)].join(" ") : anchor;
}


/** @param {String} s */
function copyTextToClipboard(s) {
    navigator.clipboard.writeText(s);
    alert(i18n.getp("alert-text-copy-ok", '"%0" copied to the clipboard!', [s]));
}


function copyLink(s) {
    const text = i18n.get("copy", "copy");
    return "<small>(" + makeAnchorStr(`javascript:copyTextToClipboard('${s}')`, {text}) + ")</small>";
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

    Table.updateAll(options.keep_input ? ["updateInput"] : []);

    operationUpdate();
    state.axes = state.pcset.getInversionalSymmetryAxes();
    drawVisualization(options);
}



/** @param {PcSet[]} arr */
function pcsetArrayToStr(arr) {
    return arr.map((pcset) => pcset.toString("short-ab",false))
              .sort((a,b) => (a.length - b.length) || a.localeCompare(b))
              .join(',');
}


/** @param {String} s */
function strToPcsetArray(s) {
    const ss = s.split(',');
    return ( ss == "" ) ? [] : ss.map((item) => new PcSet(item));
}


function operationUpdate(reset = false) {
    const op = table_cells.operation.selector.value;
    const previous = parseInt(table_cells.operation.index.getAttribute("previous-value"));
    let index = parseInt(table_cells.operation.index.value);
    switch ( op ) {
        case "Rn":
            table_cells.operation.index.setAttribute("max", state.pcset.size);
            table_cells.operation.index.setAttribute("min", -state.pcset.size);
            if ( reset ) index = 1;
            if ( index == 0 ) index = -Math.sign(previous);
            if ( Math.abs(index) >= state.pcset.size ) index = 0;
            break;
        case "Tn":
            table_cells.operation.index.setAttribute("max", 12);
            table_cells.operation.index.setAttribute("min", -12);
            if ( reset ) index = 1;
            if ( index == 0 ) index = -Math.sign(previous);
            if ( Math.abs(index) >= 12 ) index = Math.sign(index);
            break;
        default:
            table_cells.operation.index.setAttribute("max", 12);
            table_cells.operation.index.setAttribute("min", -1);
            if ( reset || index >= 12 ) index = 0;
            if ( index < 0 ) index += 12;
    }
    table_cells.operation.index.value = index.toString();
    table_cells.operation.index.setAttribute("previous-value", index.toString());

    let result;
    switch ( op ) {
        case "Rn": result = state.pcset.shifted(index); break;
        case "Tn": result = state.pcset.transpose(index); break;
        case "In": result = state.pcset.invert(index); break;
        case "Mn": result = state.pcset.multiply(index); break;
        default: result = state.pcset;
    }

    table_cells.operation.result.setHTMLUnsafe(
        pcsetHyperlink(result, {op: [op,index], enable: true, normalize: false}));
}


function pcsetRotate(amount) {
    state.pcset.shift(amount);
    showPcset({ no_history: false, keep_input: false, keep_polygon: true });
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
    let zero_set = pcset.reduced.toString("short-ab", PCSET_DEFAULT_BRACKETS);
    return i18n.getSetNames(zero_set);
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
        (item) => pcsetHyperlink(item, options) 
    ).join(options.sep ?? " ");
}


/**
 * Construct a string from a collection os sets, with hyperlinks to the sets.
 * @param {[Number[],PcSet][]} sets - pitch-class sets;
 * @param {String} op - operation string ('Tn','In',...), defaults to _null_;
 * @param {Object} options - Accepts the following properties:
 * @param {String} options.eq - separator between operation and set, defaults to _' = '_;
 * @param {String} options.sep - separator string, defaults to _", "_;
 * @param {Boolean} options.normalize - force set to normal form; defaults to _true_.
 * @returns {String}
 */
function taggedSetCollectionToLinks(sets, op = null, options = {}) { //} op = null, sep = " = ", include_op_in_link = true) {
    let strings = [];
    for ( const item of sets ) {
        const indexes = integerRangesToStr(item[0]);
        if ( item[0].length > 1 ) item[1] = item[1].normal;
        strings.push(
            `${op.replace('n', "<sub>" + indexes + "</sub>")}${(options.eq ?? " = ").replaceAll(' ',"&nbsp;")}${
                pcsetHyperlink(item[1], op
                    ? { ...options, op: [op,item[0][0]], normalize: options.normalize ?? true }
                    : { ...options, normalize: options.normalize ?? true }
                )}`
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
    state.pcset = new PcSet(Table.input_value);
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
    showPcset({ keep_input: false });
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


function updateInterfaceFromConfig() {
    const lang_radio = document.querySelector(`input[name="lang"][value="${i18n.language}"]`);
    if ( lang_radio )
        lang_radio.checked = true;
    document.getElementById("radio-setformat-short-ab-label").innerHTML = config.set_brackets[0] + "012…9AB" + config.set_brackets[1];
    document.getElementById("radio-setformat-short-te-label").innerHTML = config.set_brackets[0] + "012…9TE" + config.set_brackets[1];
    document.getElementById("radio-setformat-numbers-label").innerHTML = config.set_brackets[0] + "0,1,2,…,9,10,11" + config.set_brackets[1];
    document.getElementById("radio-setformat-notes-sharps-label").innerHTML = config.set_brackets[0] + "C,C&#9839;,D,…,A,A&#9839;,B" + config.set_brackets[1];
    document.getElementById("radio-setformat-notes-flats-label").innerHTML = config.set_brackets[0] + "C,D&#9837;,D,…,A,B&#9837;,B" + config.set_brackets[1];
    document.getElementById("chk-visible-data-row-cti-label").innerHTML = 
        i18n.getp("row-cti", "Common tones under %0", [config.inversion_format])
        .replace(':', '');
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
    document.querySelector(`input[name="font"][value="${config.font}"]`).checked = true;
    document.getElementById("chk-sound-midi").checked = config.sound_midi;
    document.getElementById("chk-sound-toggle").checked = config.sound_toggle;
    updateAppearance();
    updateLayout();
}

function updateConfigFromInterface() {
    const lang = document.querySelector('input[name="lang"]:checked')?.value;
    if ( lang && i18n.language != lang )
        changeLanguage(lang);
    config.layout = document.querySelector('input[name="div-layout"]:checked').value;
    const new_set_format = document.querySelector(`input[name="set-format"]:checked`).value;
    const set_format_changed = ( new_set_format != config.set_format );
    config.set_format = new_set_format;
    if ( set_format_changed ) Table.updateInput();
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
    config.font = document.querySelector('input[name="font"]:checked').value;
    config.sound_midi = document.getElementById("chk-sound-midi").checked;
    config.sound_toggle = document.getElementById("chk-sound-toggle").checked;
    updateAppearance();
    updateLayout();
    saveConfig();
}


function on_system_theme_change_event_handler(event) {
    updateAppearance();
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

function updateAppearance() {
    const theme = getCurrentTheme();
    document.documentElement.setAttribute("theme", theme);
    document.getElementById("color-scheme").setAttribute("content", theme);
    if ( config.font == "serif" ) {
        document.body.classList.remove("font-sans");
        document.body.classList.add("font-serif");
    } else {
        document.body.classList.remove("font-serif");
        document.body.classList.add("font-sans");
    }
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

Table.collectRows();
populateConfigDialogTableRows();
readConfig();

// Load data files 
Promise.all(DATA_FILES.map(
    (datafile) => i18n.fetchDataFile(datafile)
)).then(() => {
    // Add radio inputs to options dialog
    i18n.getAvailableLanguages()
    .sort((a,b) => a.name.localeCompare(b.name))
    .forEach((lang) => addLanguageToConfig(lang.code, lang.name));
    updateInterfaceFromConfig();
    // Set default language
    if ( config.language === null ) {
        config.language = i18n.getPreferredLanguage();
        saveConfig();
    }
    // Change language if needed
    changeLanguage(config.language);
});

addEventListener("popstate", historyEventHandler);
window.matchMedia('(prefers-color-scheme: dark)').addEventListener("change", on_system_theme_change_event_handler);

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
