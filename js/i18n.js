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


// var string_data = new Object();


const i18n = {

    data: {},
    lang: null,
    fallback_lang: "en",

    get language() {
        return this.lang ? this.lang : this.fallback_lang;
    },

    /** 
     * @param {String} key
     * @param {String} def - Default string
     * @returns {?String}
     */
    get(key, def) {
        return this.data[this.language]?.strings[key] 
            ?? this.data[this.fallback_lang]?.strings[key]
            ?? def;
    },

    /** 
     * @param {String} key
     * @param {String} def - Default string
     * @param {Array} params - Parameters to insert
     * @returns {?String}
     */
    getp(key, def, params) {
        let s = this.get(key, def).replaceAll("%%", '%');
        for ( let i = 0; i < params.length; i++ )
            s = s.replaceAll(`%${i}`, `${params[i]}`);
        return s;
    },

    /** @returns {String[]} */
    getAvailableLanguageCodes() {
        return Object.keys(this.data);
    },

    getAvailableLanguages() {
        return this.getAvailableLanguageCodes()
            .map((key) => ({code: this.data[key].lang.code, name: this.data[key].lang.name}));
    },

    /** @param {Element} elm */
    translateElement(elm) {
        if ( elm.hasAttribute("i18n") ) {
            const params = Array.from(elm.children).map((elm) => elm.outerHTML);
            elm.setHTMLUnsafe(this.getp(
                elm.getAttribute("i18n"), 
                elm.innerHTML, 
                params
            ));
        }
    },

    /** @param {Element} elm */
    translateDOM(elm) {
        this.translateElement(elm);
        for ( const c of elm.children )
            this.translateDOM(c);
    },

    /** @returns {?String} */
    getLanguageFromURL() {
        var param = getUrlQueryValue("lang");
        if ( param ) {
            param = param.toLowerCase();
            return param;
        }
        return null;
    },

    /** @returns {?String} */
    getBrowserLanguage() {
        const available = this.getAvailableLanguageCodes();
        for ( let browser_lang of navigator.languages ) {
            browser_lang = browser_lang.toLowerCase();
            for ( const lang of available )
                if ( browser_lang.startsWith(lang) )
                    return lang;
        }
        return null;
    },

    /** @returns {String} */
    getPreferredLanguage() {
        return this.getBrowserLanguage()
            ?? this.language
            ?? this.fallback_lang;
    },

    setLanguage(lang) {
        this.lang = lang;
        return lang;
    },

    /** @param {String} set @returns {String[]} */
    getSetNames(set) {
        return this.data[this.language]?.sets?.[set]?.names
            ?? this.data[this.fallback_lang]?.sets?.[set]?.names
            ?? [];
    },

    getSetNameData() {
        return this.data[this.language]?.sets
            ?? this.data[this.fallback_lang]?.sets
            ?? null;
    },

    /**
     * @param {String} filepath 
     * @param {(data)} [callback] 
     */
    async fetchDataFile(filepath, callback = null) {
        const result = await fetchJson(filepath, false);
        const code = result["lang"]["code"];
        this.data[code] = result;
        callback?.(result);
        return result;
    },

}


async function fetchJson(filepath) {
    const response = await fetch(filepath);
    if ( ! response.ok )
        throw new Error( (try_gz)
            ? `Could not fetch files: '${filepath}', '${filepath}.gz'`
            : `Could not fetch file: '${filepath}'`
        );
    return await response.json();
}


function changeLanguage(code) {
    if ( i18n.setLanguage(code) != code ) return;
    config.language = code;
    document.documentElement.setAttribute("lang", code);
    i18n.translateDOM(document.body);
    Table.collectRows();
    populateConfigDialogTableRows();
    updateInterfaceFromConfig();
    if ( isDialogOpen("dialog-config") )
        updateConfigDialog();
    saveConfig();
    if ( Object.hasOwn(i18n.data[code], "sets") )
        document.querySelector("#row-descriptive-name a").removeAttribute("hidden");
    Table.updateAll(["updateInput"]);
}
