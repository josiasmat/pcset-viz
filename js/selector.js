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


const DIALOG_SET_SEPARATOR = "&nbsp;&#x00b7; ";


const SetSelector = {
    elms: {
        dialog: document.getElementById("dialog-set-selector"),
        table_header: document.getElementById("dialog-set-selector-second-column-header"),
        row_name_filter: document.getElementById("table-set-row-filter-name"),
        row_feature_filter: document.getElementById("table-set-row-filter-features"),
        name_filter: document.getElementById("input-set-filter-name"),
        feature_filters: {
            filter_allinterval: document.getElementById("chk-set-filter-allinterval"),
            filter_combinatorial: document.getElementById("chk-set-filter-combinatorial"),
            filter_deepscale: document.getElementById("chk-set-filter-deepscale"),
            filter_generated: document.getElementById("chk-set-filter-generated"),
            filter_maxarea: document.getElementById("chk-set-filter-maxarea"),
            filter_maxeven: document.getElementById("chk-set-filter-maxeven"),
            filter_mirror: document.getElementById("chk-set-filter-mirror"),
            filter_myhill: document.getElementById("chk-set-filter-myhill"),
            filter_propscale: document.getElementById("chk-set-filter-propscale"),
            filter_zset: document.getElementById("chk-set-filter-zset")
        },
        rows: [0,1,2,3,4,5,6,7,8,9,10,11,12]
              .map((i) => document.getElementById(`table-set-row${( i>1 && i<11 ) ? i : 0}`))
    },

    show() {
        showDialog("dialog-set-selector");
        this.adjustDialogWidth();
    },

    showMaximized() {
        showDialog("dialog-set-selector");
        this.maximizeDialog();
    },

    maximizeDialog() {
        const dialog_style = getComputedStyle(this.elms.dialog);
        this.elms.dialog.style.width = dialog_style.maxWidth;
        this.elms.dialog.style.height = dialog_style.maxHeight;
    },

    resetDialogSize() {
        this.elms.dialog.style.removeProperty("width");
        this.elms.dialog.style.removeProperty("height");
    },

    adjustDialogWidth() {
        this.resetDialogSize();
        const dialog_style = getComputedStyle(this.elms.dialog);
        this.elms.dialog.style.width = `${parseFloat(dialog_style.height)*2}px`;
    },

    showNameFilter() { this.elms.row_name_filter.hidden = false; },
    hideNameFilter() { this.elms.row_name_filter.hidden = true; },
    showFeatureFilters() { this.elms.row_feature_filter.hidden = false; },
    hideFeatureFilters() { this.elms.row_feature_filter.hidden = true; },
    
    showRow(i) { this.elms.rows[i].parentElement.hidden = false },
    hideRow(i) { this.elms.rows[i].parentElement.hidden = true },
    
    showAllRows() { for ( let i = 0; i < 11; i++ ) this.showRow(i); },
    showRowsExcept(arr) {
        for ( let i = 0; i < 13; i++ ) 
            if ( arr.includes(i) )
                this.hideRow(i);
            else
                this.showRow(i);
    },

    setRowContent(i, s) { 
        this.elms.rows[i].innerHTML = s; 
    },

    clearFilters() {
        Object.values(this.elms.feature_filters).forEach((elm) => elm.checked = false);
        this.elms.name_filter.value = "";
    },
    clearFiltersAndUpdate() {
        Object.values(this.elms.feature_filters).forEach((elm) => elm.checked = false);
        this.elms.name_filter.value = "";
        this.update();
    },

    /** @param {PcSet} pcset @returns {Boolean} */
    applyFeatureFilters(pcset) {
        const result =
                ( !document.getElementById("chk-set-filter-allinterval").checked 
                    || pcset.icvector().count_value(1) == 6)
             && ( !document.getElementById("chk-set-filter-combinatorial").checked 
                    || pcset.hexachordalCombinatorialityDegree() )
             && ( !document.getElementById("chk-set-filter-deepscale").checked 
                    || pcset.isDeepScale())
             && ( !document.getElementById("chk-set-filter-generated").checked 
                    || pcset.getGenerators().length > 0 )
             && ( !document.getElementById("chk-set-filter-maxarea").checked 
                    || pcset.hasMaximalPolygonalArea() )
             && ( !document.getElementById("chk-set-filter-maxeven").checked 
                    || pcset.isMaximallyEven() )
             && ( !document.getElementById("chk-set-filter-mirror").checked 
                    || pcset.isMirror() )
             && ( !document.getElementById("chk-set-filter-myhill").checked 
                    || pcset.hasMyhillProperty() )
             && ( !document.getElementById("chk-set-filter-propscale").checked 
                    || pcset.isProperScale() )
             && ( !document.getElementById("chk-set-filter-zset").checked 
                    || pcset.zcorrespondent );
            return result;
    },

    updater: null,
    setAndCallUpdater(f) { this.updater = f; f(); },
    clearUpdater() { this.updater = null; },
    update() { this.updater?.(); },

    setTableHeader(s) { this.elms.table_header.setHTMLUnsafe(s); }
}


function showPrimeSelector() {
    SetSelector.setTableHeader(config.prime_unique 
        ? i18n.get("selector-prime-header", "Prime forms") 
        : i18n.get("selector-prime-inv-header", "Prime forms and their inverses") 
    );
    SetSelector.clearUpdater();
    SetSelector.clearFilters();
    SetSelector.showFeatureFilters();
    SetSelector.hideNameFilter();
    SetSelector.showAllRows();

    const update = () => {
        // set of cardinality 0, 1, 11 & 12
        SetSelector.setRowContent(0, 
            [new PcSet(), new PcSet("0"), new PcSet("0123456789A"), new PcSet("0123456789AB")]
            .filter((set) => SetSelector.applyFeatureFilters(set))
            .map((set) => makeSelectorSetLink(set.toString("short-ab", false), set.toString(config.set_format, config.set_brackets)))
            .join(DIALOG_SET_SEPARATOR)
        );
    
        // remaining sets
        for ( let i = 2; i < 11; i++ ) {
            let links = []
            for ( let entry of Object.entries(PCSET_CATALOG[i]) ) {
                const set = new PcSet(entry[0].slice(1,-1));
                if ( !SetSelector.applyFeatureFilters(set) ) 
                    continue;
                const text = set.toString(config.set_format, config.set_brackets);
                links.push(makeSelectorSetLink(set, text));
                if ( !config.prime_unique && entry[1].inv ) {
                    const inv_set = entry[1].inv.slice(1,-1);
                    const inv_text = new PcSet(inv_set).toString(config.set_format, config.set_brackets);
                    links.push(makeSelectorSetLink(inv_set, inv_text));
                }
            }
            SetSelector.setRowContent(i, links.join(DIALOG_SET_SEPARATOR));
        }
    }

    SetSelector.setAndCallUpdater(update);
    SetSelector.showMaximized();
}


function showForteSelector() {
    SetSelector.setTableHeader(
        i18n.get("selector-forte-header", "Forte/Morris names")
    );
    SetSelector.clearUpdater();
    SetSelector.clearFilters();
    SetSelector.hideNameFilter();
    SetSelector.showFeatureFilters();
    SetSelector.showAllRows();

    const update = () => {
        // set of cardinality 0, 1, 11 & 12
        SetSelector.setRowContent(0, 
            [new PcSet(), new PcSet("0"), new PcSet("0123456789A"), new PcSet("0123456789AB")]
            .filter((set) => SetSelector.applyFeatureFilters(set))
            .map((set) => makeSelectorSetLink(set.toString("short-ab", false), set.forte_name))
            .join(DIALOG_SET_SEPARATOR)
        );
    
        // remaining sets
        for ( let i = 2; i < 11; i++ ) {
            let links = []
            for ( let entry of Object.entries(PCSET_CATALOG[i]) ) {
                const set = entry[0].slice(1,-1);
                if ( !SetSelector.applyFeatureFilters(new PcSet(set)) )
                    continue;
                const name = entry[1].fn;
                if ( !config.prime_unique && entry[1].inv ) {
                    const inv = entry[1].inv.slice(1,-1);
                    links.push(makeSelectorSetLink(set, name+'A'));
                    links.push(makeSelectorSetLink(inv, name+'B'));
                } else
                    links.push(makeSelectorSetLink(set, name));
            }
            SetSelector.setRowContent(i, links.join(DIALOG_SET_SEPARATOR));
        }
    }

    SetSelector.setAndCallUpdater(update);
    SetSelector.showMaximized();
}


function showCarterSelector() {
    SetSelector.setTableHeader(
        i18n.get("selector-carter-header", "Carter numbers")
    );
    SetSelector.clearUpdater();
    SetSelector.clearFilters();
    SetSelector.hideNameFilter();
    SetSelector.showFeatureFilters();

    // no carter numbers for cardinality 0, 1, 11 & 12
    SetSelector.setRowContent(0, "");
    SetSelector.showRowsExcept([0,1,11,12]);

    const update = () => {
        // remaining sets
        for ( let i = 2; i < 11; i++ ) {
            let sets = [];
            for ( let entry of Object.entries(PCSET_CATALOG[i]) ) {
                const set = [entry[0].slice(1,-1), entry[1].cn];
                if ( SetSelector.applyFeatureFilters(new PcSet(set[0])) )
                    sets = sets.concat([set]);
            }
            sets.sort((a,b) => a[1] - b[1]);
            const s = sets.map((set) => makeSelectorSetLink(
                set[0], `${getCardinalSetName(i)}-${parseInt(set[1])}`)
            ).join(DIALOG_SET_SEPARATOR);
            SetSelector.setRowContent(i, s);
        }
    }

    SetSelector.setAndCallUpdater(update);
    SetSelector.showMaximized();
}


function showDescriptionSelector() {
    SetSelector.setTableHeader(
        i18n.get("selector-descriptive-names-header", "Descriptive names")
    );
    SetSelector.clearUpdater();
    SetSelector.clearFilters();
    SetSelector.showNameFilter();
    SetSelector.showFeatureFilters();

    const update = () => {

        let filter_str = SetSelector.elms.name_filter.value;
        const filters = filter_str.trim()
                                  .normalize("NFD")
                                  .replace(/\p{Diacritic}/gu, "")
                                  .toLowerCase()
                                  .split(" ");

        const filterName = (name) => {
            if ( !filter_str ) return true;
            name = name.normalize("NFD")
                       .replace(/\p{Diacritic}/gu, "")
                       .toLowerCase();
            for ( const filter of filters ) {
                if ( !name.includes(filter) )
                    return false;
            }
            return true;
        }

        // collect names
        let sets = Array(13);
        for ( let i = 0; i < 13; i++ ) sets[i] = [];
        for ( let entry of Object.entries(i18n.getSetNameData()) ) {
            const set = new PcSet(entry[0]);
            const len = set.size; //entry[0].length-2;
            const str_short = set.toString("short-ab", null);// entry[0].substring(1,len+1);
            const str_full = set.toString(config.set_format, config.set_brackets);
            const hint = `${str_full} (${config.prime_unique ? set.forte_name : set.forte_name_ab})\n${entry[1]["names"].join("\n")}`;
            for ( let name of entry[1]["names"] ) {
                if ( filterName(name) && SetSelector.applyFeatureFilters(set) ) {
                    const link = makeSelectorSetLink(str_short,name, {hint:hint,nosetfont:true});
                    sets[len].push({name:name,set:str_short,link:link});
                }
            }
        }
        for ( let i of [1,11,12] ) {
            sets[0].push(...sets[i]);
            sets[i] = [];
        }
        for ( let array of sets )
            if ( array.length > 1 )
                array.sort((a,b) => a.name.localeCompare(b.name));

        for ( let i of [0,2,3,4,5,6,7,8,9,10] ) {
            let links = sets[i].map((x) => x.link);
            SetSelector.setRowContent(i, links.join(DIALOG_SET_SEPARATOR));
        }
    }

    SetSelector.setAndCallUpdater(update);
    SetSelector.showMaximized();

}


function showSubsetSelector() {
    const superset = state.pcset.normal;
    SetSelector.setTableHeader(i18n.getp(
        "selector-subsets-header", "Subsets of %0",
        [`<span class="setfont">${superset.toString(
            config.set_format, config.set_brackets
        )}</span>`]
    ));
    SetSelector.clearUpdater();
    SetSelector.clearFilters();
    SetSelector.hideNameFilter();
    SetSelector.hideFeatureFilters();

    const subsets = superset.getSubsets();
    subsets.sort((a,b) => a.binary_value - b.binary_value);

    const update = () => {
    
        let links = Array(13);
        for ( let i = 0; i < 13; i++ ) links[i] = [];
    
        for ( let subset of subsets ) {
            const set = subset.toString("short-ab", null);
            const text = subset.toString(config.set_format, config.set_brackets);
            links[subset.size].push(makeSelectorSetLink(set, text));
        }
    
        // set of cardinality 0, 1, 11 & 12
        const s0 = links[0].concat(links[1]).concat(links[11]).concat(links[12]).join(DIALOG_SET_SEPARATOR);
        SetSelector.setRowContent(0, s0);
        if ( s0 ) SetSelector.showRow(0); else SetSelector.hideRow(0);
    
        // remaining sets
        for ( let i = 2; i < 11; i++ ) {
            const si = links[i].join(DIALOG_SET_SEPARATOR);
            SetSelector.setRowContent(i, si);
            if ( si ) SetSelector.showRow(i); else SetSelector.hideRow(i);
        }
    }

    SetSelector.setAndCallUpdater(update);
    SetSelector.show();
}


function showPrimeSubsetSelector() {
    const superset = state.pcset.prime;
    SetSelector.setTableHeader(i18n.getp(
        "selector-subsets-classes-header", "Subsets classes of %0",
        [`<span class="setfont">${superset.toString(
            config.set_format, config.set_brackets
        )}</span>`]
    ));
    SetSelector.clearUpdater();
    SetSelector.clearFilters();
    SetSelector.hideNameFilter();
    SetSelector.hideFeatureFilters();

    const subsets = superset.getPrimeSubsets();

    const update = () => {
        let links = Array(13);
        for ( let i = 0; i < 13; i++ ) links[i] = [];
    
        for ( let subset of subsets ) {
            const set = subset.toString("short-ab", null);
            const text = subset.toString(config.set_format, config.set_brackets);
            links[subset.size].push(makeSelectorSetLink(set, text));
        }
    
        // set of cardinality 0, 1, 11 & 12
        const s0 = links[0].concat(links[1]).concat(links[11]).concat(links[12]).join(DIALOG_SET_SEPARATOR);
        SetSelector.setRowContent(0, s0);
        if ( s0 ) SetSelector.showRow(0); else SetSelector.hideRow(0);
    
        // remaining sets
        for ( let i = 2; i < 11; i++ ) {
            const si = links[i].join(DIALOG_SET_SEPARATOR);
            SetSelector.setRowContent(i, si);
            if ( si ) SetSelector.showRow(i); else SetSelector.hideRow(i);
        }
    }

    SetSelector.setAndCallUpdater(update);
    SetSelector.show();
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


function makeSelectorSetLink(set, text, options = {}) {
    const attr_class = options.nosetfont ? '' : ' class="setfont"';
    const attr_title = options.hint ? ` title="${options.hint}"` : '';
    return `<a${attr_class} href="javascript:goto('${set}')"${attr_title}>${text}</a>`;    
}
