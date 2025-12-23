// File load/save utilities
"use strict";


/**
 * Writes a string to a file
 * @param {String} str - Source string
 * @param {String?} filename - Default filename
 */
function writeStringToFile(str, filename = "output.txt") {
    const blob = new Blob([str], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";

    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}


/**
 * Reads a string from a user selected file
 * @returns {Promise<String>}
 */
function loadStringFromFile() {
    return new Promise((resolve, reject) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "text/*";

        input.onchange = () => {
            const file = input.files[0];
            if (!file) {
                reject(new Error("No file selected"));
                return;
            }

            const reader = new FileReader();

            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);

            reader.readAsText(file);
        };

        input.click();
    });
}


/**
 * Writes a JSON file
 * @param {Object} obj - Source object
 * @param {String?} filename - Default file name
 */
function saveJsonToFile(obj, filename = "output.json") {
    const json = JSON.stringify(obj, null, 2); // pretty-printed
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";

    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}


/**
 * Reads JSON from a user selected file
 * @returns {Promise<Object>}
 */
function loadJsonFromFile() {
    return new Promise((resolve, reject) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json,.json";

        input.onchange = () => {
            const file = input.files[0];
            if (!file) {
                reject(new Error("No file selected"));
                return;
            }

            const reader = new FileReader();

            reader.onload = () => {
                try {
                    const obj = JSON.parse(reader.result);
                    resolve(obj);
                } catch (e) {
                    reject(new Error("Invalid JSON file"));
                }
            };

            reader.onerror = () => reject(reader.error);

            reader.readAsText(file, "utf-8");
        };

        input.click();
    });
}
