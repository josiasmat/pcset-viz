/****************************
 *                          *
 *   Translation routines   *
 *                          *
 ****************************/

function getPreferredTranslation(available_translations, default_language = "en") {
    // check url query
    var url_param_lang = getUrlQueryValue("lang");
    if ( url_param_lang != null ) {
        url_param_lang = url_param_lang.toLowerCase();
        for ( const translation of available_translations ) {
            if ( url_param_lang == translation )
                return translation;
        }
    }
    // check browser languages
    for ( let lang of navigator.languages ) {
        lang = lang.toLowerCase();
        for ( const translation of available_translations ) {
            if ( lang.startsWith(translation) )
                return translation;
        }
    }
    // return default
    return default_language;
}

function getTranslatedStr(key, i18n_data) {
    if ( i18n_data.hasOwnProperty(key) ) {
        return i18n_data[key];
    } else {
        console.log(`getTranslatedStr():\nKey '${key}' not found for language '${language}'.`);
        return null;
    }
}

function translate(element, i18n_data) {
    // translate element if it has i18n attribute
    if ( element.hasAttribute("i18n") ) {
        const str = getTranslatedStr(element.getAttribute("i18n"), i18n_data);
        if ( str ) element.innerHTML = str;
    }
    // recurse into child nodes
    if ( element.hasChildNodes() ) {
        for ( const child of element.children )
            translate(child, i18n_data);
    }
}

function translateStringsMap(i18n_data, string_map) {
    for ( const k of string_map.keys() ) {
        const s = getTranslatedStr(k, i18n_data);
        if ( s ) string_map.set(k, s);
    }
}

async function fetchJson(filepath, try_gz) {
    if ( try_gz ) {
        const compressed_path = filepath + '.gz';
        const response = await fetch(compressed_path);
        if ( response.ok ) {
            const blob = await response.blob();
            const ds = new DecompressionStream('gzip');
            const result = new Response(blob.stream().pipeThrough(ds));
            if ( result.ok )
                return await result.json();
        }
    }
    const response = await fetch(filepath);
    if ( ! response.ok )
        throw new Error( (try_gz)
            ? `Could not fetch files: '${filepath}', '${filepath}.gz'`
            : `Could not fetch file: '${filepath}'`
        );
    return await response.json();
}
