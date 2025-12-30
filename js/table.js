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


const table_cells = {
    favorites: document.getElementById("favorites"),
    favorites_toggle: document.getElementById("favorites-toggle"),
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
    inversions: document.getElementById("inversions"),
    ctt: document.getElementById("ctt"),
    ctt_op_label: document.getElementById("ctt-op-label"),
    cti: document.getElementById("cti"),
    cti_op_label: document.getElementById("cti-op-label"),
    multiplications: document.getElementById("multiples"),
    subsets: document.getElementById("subsets"),
    operation: {
        selector: document.getElementById("operation-selector"),
        index: document.getElementById("operation-index"),
        result: document.getElementById("operation-result")
    }
}


class TableRow {
    element; id; label; default;

    /** @param {HTMLElement} elm */
    constructor(elm) {
        this.element = elm;
        this.id = elm.id;
        this.default = !elm.hasAttribute("hidden");
        this.update();
    }

    update() {
        const text = this.element.firstElementChild.textContent;
        this.label = text.trim().substring(0, text.indexOf(":"));
    }

    get visible() { return !(this.hidden); }
    get hidden() { return (this.element.hasAttribute("hidden")); }
    set visible(value) { if ( value != this.visible ) this.toggle(); }
    set hidden(value) { if ( value != this.hidden ) this.toggle(); }
    toggle() { this.element.toggleAttribute("hidden"); }
    show() { this.visible = true; }
    hide() { this.hidden = true; }
}


const Table = {

    input_main: document.getElementById("input-main"),

    /** @type {TableRow[]} */
    rows: [],

    toggleRow(id, checked = null) {
        const checkbox = document.getElementById(id);
        const target_id = checkbox.getAttribute("target");
        const target_elm = document.getElementById(target_id);
        if ( checked == null )
            target_elm.toggleAttribute("hidden");
        else
            target_elm.setAttribute("hidden", !checked);
        saveConfig();
    },

    collectRows() {
        if ( this.rows.length ) {
            this.rows.forEach((row) => row.update());
        } else {
            const row_elements = document.getElementById("data-table-body").children;
            for ( let elm of row_elements )
                if ( !(elm.hasAttribute("always-visible")) && !(elm.hasAttribute("disabled")) )
                    this.rows.push(new TableRow(elm));
        }
    },

    get input_value() {
        return this.input_main.value;
    },

    updateInput() {
        this.input_main.value = state.pcset.toString(config.set_format, config.set_brackets);
    },

    updateFavorites() {
        table_cells.favorites.setHTMLUnsafe(( favorites.length === 0 ) 
            ? '-' : setCollectionToLinks(favorites, {sep: " "})
        );

        table_cells.favorites_toggle.setHTMLUnsafe(
            isFavorite(state.pcset) ? '★' : '☆'
        );
    },

    updateBinValue() {
        const bv = state.pcset.binary_value;
        table_cells.binary_value.setHTMLUnsafe(
            `${strWithCopyLink(toBinary(bv, 12))} = ${strWithCopyLink(bv.toString())}`
        );
    },

    updateNormal() {
        const normal = state.pcset.normal;
        table_cells.normal_form.setHTMLUnsafe(
            pcsetHyperlink(normal, {copy: true, strong_correspondence: true})
        );
    },

    updatePrime() {
        const prime = state.pcset.prime;
        const prime_op = prime.findTransformFrom(state.pcset);
        if ( prime.hasDistinctInverse() ) {
            const prime_inv = prime.invert().reduced;
            const prime_inv_op = prime_inv.findTransformFrom(state.pcset);
            table_cells.prime_form.setHTMLUnsafe(
                pcsetHyperlink(prime, {op: prime_op, copy: true})
                + ` &#x00b7; ${i18n.get("row-prime-inverse", "Inverse:")} ` 
                + pcsetHyperlink(prime_inv, {op: prime_inv_op, copy: true}) );
        } else {
            table_cells.prime_form.setHTMLUnsafe( 
                pcsetHyperlink(prime, {op: prime_op, copy: true, strong_correspondence: true})
            );
        }
    },

    updateSetNames() {
        const fn = config.prime_unique ? state.pcset.forte_name : state.pcset.forte_name_ab;
        const cn = `${getCardinalSetName(state.pcset.cardinality)}-${state.pcset.carter_number.toString()}`;
        table_cells.forte_name.setHTMLUnsafe(strWithCopyLink(fn));
        table_cells.carter_name.setHTMLUnsafe(strWithCopyLink(cn));
    },

    updateDescriptiveNames() {
        table_cells.descriptive_name.setHTMLUnsafe(textOrDash(
            pcsetGetDescriptiveNames(state.pcset.reduced).join(", ")
        ));
    },

    updateIntervalClassVector() {
        const icv = state.pcset.icvector();
        table_cells.ic_vector.setHTMLUnsafe(strWithCopyLink(
            (config.vector_format == "short") ? icv.str_hex(true) : icv.str_numbers(true)
        ));
    },

    updateCommonToneVector() {
        const ctv = state.pcset.ctvector();
        table_cells.ct_vector.setHTMLUnsafe(strWithCopyLink(
            (config.vector_format == "short") ? ctv.str_hex(true) : ctv.str_numbers(true)
        ));
    },

    updateIntervalSpectra() {
        const spectra = PcSetSpectra.fromPcset(state.pcset);
        let spectra_str = [];
        if ( state.pcset.size > 1 ) {
            for ( let i = 1; i < state.pcset.size; i++ ) {
                spectra_str.push( `‹${i}›&nbsp;=&nbsp;${spectra.toString(i, true)}`);
            }
            const rounded_var = Math.round(spectra.variation*100)/100;
            spectra_str.push(
                `${i18n.get("row-spectra_variation", "Variation")}&nbsp;${
                    (rounded_var == spectra.variation ? '=' : '&#x2248;')}&nbsp;${rounded_var.toFixed(2)
                }`
            );
        }
        table_cells.spectra.setHTMLUnsafe(textOrDash(spectra_str.join('; ')));
    },

    updateComplement() {
        const compl = state.pcset.complement;
        const compl_prime = compl.prime;
        table_cells.complement.setHTMLUnsafe(
            pcsetHyperlink(compl) 
            + addEquivIf(!compl.isEqualTo(compl_prime), pcsetHyperlink(compl_prime))
            + ` (${config.prime_unique ? compl.forte_name : compl.forte_name_ab})`
        );
    },

    updateZCorrespondent() {
        const zc = state.pcset.zcorrespondent;
        table_cells.zcorrespondent.setHTMLUnsafe(
            (zc) ? `${pcsetHyperlink(zc)} (${config.prime_unique ? zc.forte_name : zc.forte_name_ab})` : "-"
        );
    },

    updateSumClass() {
        table_cells.sumclass.setHTMLUnsafe(
            `${state.pcset.sum} ≡ ${state.pcset.sum_class} <small>(mod12)</small>`
        );
    },

    updateFeatures() {
        const features = [];
        if ( state.pcset.icvector().count_value(1) == 6 ) 
            features.push(htmlNonBreakingSpaces(i18n.get("all-interval", "All-interval")));
        if ( state.pcset.isMirror() ) 
            features.push(i18n.get("mirror", "Mirror"));
        if ( state.pcset.isMaximallyEven() ) 
            features.push(htmlNonBreakingSpaces(i18n.get("maximally-even", "Maximally even")));
        if ( state.pcset.hasMaximalPolygonalArea() ) 
            features.push(htmlNonBreakingSpaces(i18n.get("maximal-area", "Maximal area")));
        switch ( state.pcset.isProperScale() ) {
            case 1: features.push(htmlNonBreakingSpaces(i18n.get("proper-scale", "Proper scale"))); break;
            case 2: features.push(htmlNonBreakingSpaces(i18n.get("strictly-proper-scale", "Strictly proper scale")));
        }
        if ( state.pcset.isDeepScale() ) 
            features.push(htmlNonBreakingSpaces(i18n.get("deep-scale", "Deep scale")));
        const generators = state.pcset.getGenerators();
        if ( generators.length > 0 ) 
            features.push(htmlNonBreakingSpaces(
                i18n.getp("generated-x", "Generated (%0)", [integerRangesToStr(generators)])
            ));
        if ( state.pcset.hasMyhillProperty() ) 
            features.push(htmlNonBreakingSpaces(i18n.get("myhill-property", "Myhill's property")));
        if ( state.pcset.zcorrespondent ) 
            features.push(i18n.get("z-set", "Z-set"));
        const comb_count = state.pcset.hexachordalCombinatorialityDegree();
        if ( comb_count > 0 ) 
            features.push(comb_count >= 3 
                ? i18n.get("all-combinatorial", "All-combinatorial") 
                : i18n.get("combinatorial", "Combinatorial"));

        table_cells.features.setHTMLUnsafe(textOrDash(features.join(", ")));
    },

    updateModes() {
        const sets = state.pcset.normal.getRotations(true).map((x) => x[1]);
        table_cells.rotations.setHTMLUnsafe(textOrDash(
            setCollectionToLinks(sets, {normalize: false, strong_correspondence: true})
        ));
    },

    updateSymmetries() {
        const inv_sym = state.pcset.getInversionallySymmetricSets();
        const trs_sym = state.pcset.getTranspositionallyEquivalentSets(false);
        table_cells.symmetries.setHTMLUnsafe(textOrDash(
            [taggedSetCollectionToLinks(inv_sym, config.inversion_format), 
             taggedSetCollectionToLinks(trs_sym, "Tn")]
            .filter((s) => s != "").join(", ")
        ));
    },

    updateHexachordalCombinatoriality() {
        const all_combs = state.pcset.getHexachordalCombinatoriality();
        const getCombinatorialsStr = (combs, type_str) => {
            if ( combs.length == 0) return '';
            return `${type_str}<sub>${combs.join(',')}</sub>`;
        }
        let combs_str = [
            getCombinatorialsStr(all_combs.i, 'I'),
            getCombinatorialsStr(all_combs.p, 'P'),
            getCombinatorialsStr(all_combs.ri, 'RI'),
            getCombinatorialsStr(all_combs.r, 'R')
        ].filter( (s) => s ).join(' ');
        table_cells.combinatorials.setHTMLUnsafe(textOrDash(combs_str));
    },

    updateTranspositions() {
        const sets = state.pcset.getTranspositionsUnique(false);
        table_cells.transpositions.setHTMLUnsafe(textOrDash(
            taggedSetCollectionToLinks(sets, "Tn")
        ));
    },

    updateInversions() {
        const sets = state.pcset.getInversionsUnique();
        table_cells.inversions.setHTMLUnsafe(textOrDash(
            taggedSetCollectionToLinks(sets, config.inversion_format)
        ));
    },

    updateCommonTonesUnderT() {
        const ctts = state.pcset.getCttsUnique(false);
        table_cells.ctt.setHTMLUnsafe(textOrDash(
            taggedSetCollectionToLinks(ctts, "Tn", {eq: ": "})
        ));
    },

    updateCommonTonesUnderI() {
        const ctis = state.pcset.getCtisUnique();
        table_cells.cti.setHTMLUnsafe(textOrDash(
            taggedSetCollectionToLinks(ctis, config.inversion_format, {eq: ": "})
        ));
        table_cells.cti_op_label.setHTMLUnsafe(
            ( config.inversion_format == "In" ) ? "I<sub>n</sub>" : "T<sub>n</sub>I"
        );
    },

    updateMultiplications() {
        const sets = state.pcset.getMultiplesUnique();
        table_cells.multiplications.setHTMLUnsafe(textOrDash(
            taggedSetCollectionToLinks(sets, "Mn")
        ));
    },

    updateRulerView() {
        const adaptRulerView = (elm, type, index) => {
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
        table_cells.ruler_view.setHTMLUnsafe(ruler_view.svg.outerHTML);
    },

    updateStaffView() {
        /** @param {HTMLElement} elm @param {String} type @param {Number} index */
        const adaptStaffView = (elm, type, index) => {
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

        const reduceSwappedAccidentalsCallback = (a, x, i, s) => {
            if ( x ) { 
                if ( state.pcset.has(i) ) a.push(i); else s[i] = false;
            }
            return a;
        }

        const scale = MusicalScale.fromPcset(state.pcset);
        const staff_view = new StaticStaffPcSetView(
            scale, 
            { 
                scale: 0.2, 
                clef: config.staff_clef,
                accidental_swap: state.staff_accidental_swap
                    .reduce(reduceSwappedAccidentalsCallback, []),
                fn: adaptStaffView
            },
            (getCurrentTheme() == "dark") ? "basic-dark" : "basic-light"
        );
        table_cells.staff_view.setHTMLUnsafe(staff_view.svg.outerHTML);
    },

    /** @param {String[]?} except - List of excluded functions */
    updateAll(except = []) {
        for ( const [key,fn] of Object.entries(this) ) {
            if ( key.startsWith("update") && key != "updateAll" && !except.includes(key) )
                fn.bind(this)();
        }
    }

}


/** @param {Boolean} cond @returns {String} */
function checkmarkIf(cond) {
    return (cond) ? "<small>✔</small> " : "";
}


/** @param {Boolean} cond @param {String} s @returns {String} */
function addEquivIf(cond, s) {
    return (cond) ? "&nbsp;&#x2261;&nbsp;" + s : "";
}


function populateConfigDialogTableRows() {
    let checkboxes = [];
    for ( let row of Table.rows ) {
        let label = row.label;
        label.replaceAll(" ", "&nbsp;");
        const checkbox_id = "chk-visible-data-" + row.id;
        const label_id = checkbox_id + "-label";
        checkboxes.push(
            `<span><input id="${checkbox_id}" type="checkbox" target="${row.id}" onchange="Table.toggleRow('${checkbox_id}')">`+
            `&nbsp;<label id="${label_id}" for="${checkbox_id}">${label}</label></span>`);
    }
    document.getElementById("visible-data-checkboxes-area").setHTMLUnsafe(checkboxes.join(" "));
}


Table.input_main.addEventListener("focus", () => Table.input_main.select());
