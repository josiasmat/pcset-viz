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


const SVG_MIME = "image/svg+xml";
const PNG_MIME = "image/png";


class PcSetBaseView {

    /** @type {HTMLElement} */
    svg;

    /** @return {Blob} */
    get svg_blob() {
        const head = '<?xml version="1.0" encoding="UTF-8"?>\n';
        return new Blob([head + this.svg.outerHTML], {type: SVG_MIME});
    }

    /**
     * @param {Number} width
     * @param {Number} height
     * @callback callback
     */
    #makePng(width, height, callback) {
        const image = new Image(this.svg.width, this.svg.height);
        const svg_url = URL.createObjectURL(this.svg_blob);
        image.src = svg_url;
        image.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0, width, height);
            URL.revokeObjectURL(svg_url);
            canvas.toBlob(callback, PNG_MIME);
        }
    }

    getStandardFilename(ext, postfix = "") {
        return `set-${new PcSet(Table.input_value).toString("short-ab", false)}${postfix}.${ext}`;
    }

    #triggerDownload(url, filename) {
        const download_link = document.createElement("a");
        download_link.href = url;
        download_link.download = filename;
        document.head.appendChild(download_link);
        download_link.click();
        document.head.removeChild(download_link);
    }

    downloadSvg(filename = null) {
        if ( !filename ) filename = this.getStandardFilename("svg");
        const url = URL.createObjectURL(this.svg_blob);
        this.#triggerDownload(url, filename);
    }
    
    downloadPng(width, height, filename = null) {
        if ( !filename ) filename = this.getStandardFilename("png");
        this.#makePng(width, height, (blob) => {
            const url = URL.createObjectURL(blob);
            this.#triggerDownload(url, filename);
        });
    }

    svgToClipboard() {
        if ( !ClipboardItem?.supports(SVG_MIME) ) {
            console.error(
                i18n.get("err-clipboard-svg-unsupported", "SVG images not supported by the clipboard.")
            );
            return;
        }
        const blob = this.svg_blob;
        navigator.clipboard.write([
            new ClipboardItem({[blob.type]: blob})
        ]);
    }

    pngToClipboard(width, height) {
        if ( !ClipboardItem?.supports(PNG_MIME) ) {
            i18n.get("err-clipboard-png-unsupported", "PNG images not supported by the clipboard.")
            return;
        }
        this.#makePng(width, height, (blob) => {
            navigator.clipboard.write([
                new ClipboardItem({[blob.type]: blob})
            ]);
        });
    }

    static getTheme(theme_name) {
        let theme = GRAPHICS_THEMES[theme_name];

        if ( !theme.fg ) theme.fg = blackf();
        if ( !theme.bg ) theme.bg = nocolor;

        if ( !theme.circle_stroke     ) theme.circle_stroke = theme.fg;
        if ( !theme.circle_fill       ) theme.circle_fill = theme.bg;
        if ( !theme.polygon_stroke    ) theme.polygon_stroke = theme.fg;
        if ( !theme.polygon_fill      ) theme.polygon_fill = theme.bg;
        if ( !theme.triangle_fill     ) theme.triangle_fill = theme.polygon_fill;
        if ( !theme.path              ) theme.path = theme.fg;
        if ( !theme.axis              ) theme.axis = theme.path;
        if ( !theme.text              ) theme.text = theme.fg;
        if ( !theme.tnz_connector     ) theme.tnz_connector = theme.path;

        if ( !theme.on                ) theme.on = {};
        if ( !theme.on.circle_stroke  ) theme.on.circle_stroke = theme.circle_stroke;
        if ( !theme.on.circle_fill    ) theme.on.circle_fill = theme.circle_fill;
        if ( !theme.on.text           ) theme.on.text = theme.text;
        if ( !theme.on.path           ) theme.on.path = theme.path;
        if ( !theme.on.tnz_connector  ) theme.on.tnz_connector = theme.tnz_connector;
        
        if ( !theme.off               ) theme.off = {};
        if ( !theme.off.circle_stroke ) theme.off.circle_stroke = nocolor;
        if ( !theme.off.circle_fill   ) theme.off.circle_fill = nocolor;
        if ( !theme.off.text          ) theme.off.text = theme.text;
        if ( !theme.off.path          ) theme.off.path = theme.path;
        if ( !theme.off.tnz_connector ) theme.off.tnz_connector = theme.tnz_connector;

        if ( !theme.note_fill         ) theme.note_fill = theme.fg;
        if ( !theme.note_stroke       ) theme.note_stroke = theme.note_fill;
        if ( !theme.staff             ) theme.staff = theme.axis;

        return theme;
    }

    drawCircleWithText(x, y, r, stroke_width, stroke, fill, text_data, text_fill, text_scale, show_text_option, has_pc) {

        const g_pc = SvgTools.createGroup();

        // Outer circle
        const outer_attrs = ( stroke.alpha > 0 ) ? {
            "stroke": stroke.css_color,
            "stroke-opacity": stroke.css_opacity,
            "stroke-width": stroke_width,
            "fill": "none"
        } : {
            "fill": fill.css_color,
            "fill-opacity": fill.css_opacity
        };

        const outer_circle = SvgTools.makeCircle(x, y, r, outer_attrs);
        g_pc.appendChild(outer_circle);

        // Inner circle
        if ( stroke.alpha > 0 && fill.alpha > 0 ) {
            const inner_circle = SvgTools.makeCircle(x, y,
                r - clamp(stroke_width * 1.5, r / 12, Math.max(r / 8, stroke_width / 2)),
                {
                    "fill": fill.css_color,
                    "fill-opacity": fill.css_opacity
                }
            );
            g_pc.appendChild(inner_circle);
        }

        // Text
        if ( show_text_option == "always" || ( show_text_option == "enabled" && has_pc ) ) {
            const text = SvgTools.makePath(text_data.d, {
                "transform": `translate(${x - text_data.w/2*text_scale} ${y - text_data.h/2*text_scale}),scale(${text_scale})`,
                "fill": text_fill.css_color,
                "fill-opacity": text_fill.css_opacity
            });
            g_pc.appendChild(text);
        }

        return g_pc;
    }

}

class StaticClockfaceView extends PcSetBaseView {

    /**
     * Creates a static clockface-type PcSet representation in svg format,
     * suitable for saving and downloading.
     * @param {PcSet} pcset a pitch-class set object.
     * @param {Object} options optional; a dictionary accepting the following properties:
     *      *note_names* (boolean), *polygon* (boolean),
     *      *symmetry_axes* (boolean), *scale* (number),
     *      *stroke_width* (number), *size* (number),
     *      *intervals* (array of number), *inversion* (number),
     *      *inversion_set_only* (boolean), *inversion_axis* (boolean).
     * @param {String} theme optional; name of a theme.
     */
    constructor(pcset, options = {}, theme = "basic-light") {

        super();

        this.pcset_str = pcset.toString("short-ab", false);

        const size = options.size ?? 500;
        const scale = options.scale ?? 1.0;
        const stroke_width = options.stroke_width ?? 3.0;

        theme = PcSetBaseView.getTheme(theme);

        const center = size/2;
        const pc_radius = size / 14.5 * scale;
        const pc_center_distance = center - pc_radius 
            - ( (theme.on.circle_stroke().alpha > 0 || theme.off.circle_stroke().alpha > 0) ? stroke_width : 0 );
        const pc_border_distance = pc_center_distance - pc_radius;
        const pc_axis_distance = pc_border_distance - (pc_radius/4);
        const pc_polygon_distance = pc_border_distance - (pc_radius/2);
        const pc_interval_distance = pc_border_distance - (pc_radius/8);

        const dashes = {
            count: 30,
            space_ratio: 1.5,
            dash_width: null,
            space_width: null,
            extra_dash: null
        }
        dashes.dash_width = (pc_center_distance*2) / (dashes.count+((dashes.count-1)*dashes.space_ratio));
        dashes.space_width = dashes.dash_width * dashes.space_ratio;
        dashes.extra_dash = dashes.dash_width + dashes.space_width;

        function getPoint(pc, from_center, angle_offset = 0) {
            const deg = (angle_offset + (pc * ( options.fifths ? 210 : 30 ) + 270)) % 360;
            const rad = degToRad(deg);
            return { x: Math.cos(rad) * from_center + center, 
                     y: Math.sin(rad) * from_center + center,
                     a: deg };
        }

        // create root svg element
        this.svg = SvgTools.createRootElement({
            "width": size.toString(),
            "height": size.toString(),
            "viewbox": [0,0,size,size].join(" ")
        });

        function makeAxis(axis, dashed) {
            // calculate line radius
            let distance = pc_axis_distance;
            if ( axis.a != Math.trunc(axis.a) ) {
                while ( distance < pc_center_distance )
                    distance += dashes.extra_dash;
            }
            const p1 = getPoint(axis.a, distance);
            const p2 = getPoint(axis.b, distance);
            const axis_line = SvgTools.makeLine(p1.x, p1.y, p2.x, p2.y, { 
                "stroke": theme.axis().css_color, 
                "opacity": theme.axis().css_opacity,
                "stroke-width": stroke_width 
            });
            if ( dashed ) {
                axis_line.setAttribute("stroke-dasharray", `${dashes.dash_width} ${dashes.space_width}`);
            }
            return axis_line;
        }

        // draw polygon
        if ( options.polygon ) {
            const points = pcset.toArray().map( (x) => getPoint(x, pc_polygon_distance) ).sort((a,b) => a.a - b.a);
            if ( pcset.size > 2 ) {
                const polygon_attrs = { 
                    "fill": theme.polygon_fill().css_color, 
                    "fill-opacity": theme.polygon_fill().css_opacity
                };
                if ( theme.polygon_stroke().alpha > 0 ) {
                    polygon_attrs["stroke"] = theme.polygon_stroke().css_color;
                    polygon_attrs["stroke-opacity"] = theme.polygon_stroke().css_opacity;
                    polygon_attrs["stroke-width"] = stroke_width;
                }
                const polygon = SvgTools.makePolygon(points, polygon_attrs);
                this.svg.appendChild(polygon);
            } else if ( pcset.size == 2 ) {
                const polygon_color = ( theme.polygon_stroke().alpha > 0 )
                    ? theme.polygon_stroke() : theme.polygon_fill();
                const polygon = SvgTools.makeLine(
                    points[0].x, points[0].y, points[1].x, points[1].y, { 
                        "stroke": polygon_color.css_color,
                        "stroke-opacity": polygon_color.css_opacity,
                        "stroke-width": stroke_width
                });
                this.svg.appendChild(polygon);
            }
        }

        // draw intervals
        if ( options.intervals && Array.isArray(options.intervals) ) {
            const g_intervals = SvgTools.createGroup();
            for ( const pc1 of pcset ) {
                for ( const interval of options.intervals ) {
                    const pc2 = mod12(pc1 + interval);
                    if ( pcset.has(pc2) ) {
                        const p1 = getPoint(pc1, pc_interval_distance);
                        const p2 = getPoint(pc2, pc_interval_distance);
                        const pm = {
                            x: (p1.x + p2.x) / 2, 
                            y: (p1.y + p2.y) / 2
                        }
                        let pq = { 
                            x: ( pm.x + center ) / 2, 
                            y: ( pm.y + center ) / 2
                        };
                        if ( options.fifths ? interval == 5 : interval == 1 ) {
                            pq.x = (pm.x + pq.x) / 2;
                            pq.y = (pm.y + pq.y) / 2;
                        }
                        const interval_line = SvgTools.makePath(
                            ['M', p1.x, p1.y, 'Q', pq.x, pq.y, p2.x, p2.y],
                            {
                                "fill": "none",
                                "stroke": theme.path().css_color,
                                "stroke-width": stroke_width,
                                "opacity": theme.path().css_opacity
                            }
                        );
                        g_intervals.appendChild(interval_line);
                    }
                }
            }
            this.svg.appendChild(g_intervals);
        }

        function computePathLength(pc1, pc2) {
            const ic = computeIntervalClass(pc1, pc2);
            return ( options.fifths ) ? [0,5,2,3,4,1,6][ic] : ic;
        }

        // draw inversion lines
        if ( options.inversion != null ) {
            if ( options.inversion_axis ) {
                const axis_line = makeAxis(Axis.fromIndex(options.inversion), false);
                axis_line.setAttribute("stroke-opacity", 0.5);
                this.svg.appendChild(axis_line);
            }
            const g_inv_lines = SvgTools.createGroup();
            if ( pcset.size > 0 ) {
                const df = SvgTools.createElement("defs");
                const mk = SvgTools.makeSimpleArrowMarker("arrow", 
                    size / 25 / Math.sqrt(stroke_width), {
                        "fill": theme.on.path().css_color,
                    }
                );
                mk.setAttribute("refX", 9);
                df.appendChild(mk);
                this.svg.appendChild(df);
            }
            const first_pitch = Math.ceil(options.inversion / 2);
            const end_pitch = first_pitch + 6 ;
            for ( let pitch = first_pitch; pitch < end_pitch; pitch++ ) {
                const pc = mod12(pitch);
                const pci = mod12(options.inversion - pc);
                if ( pc == pci ) continue;
                const pl = computePathLength(pc, pci);
                const p1 = getPoint(pc, pc_axis_distance);
                const p2 = getPoint(pci, pc_axis_distance);
                const pm = {
                    x: (p1.x + p2.x) / 2, 
                    y: (p1.y + p2.y) / 2
                }
                let pq = { 
                    x: ( pm.x + (center * 3) ) / 4, 
                    y: ( pm.y + (center * 3) ) / 4
                };
                if ( pl <= 2 ) {
                    pq.x = (pm.x + (pq.x * (pl+1))) / (pl+2);
                    pq.y = (pm.y + (pq.y * (pl+1))) / (pl+2);
                }
                if ( pcset.has(pc) || pcset.has(pci) ) {
                    const line = SvgTools.makePath(
                        ['M', p1.x, p1.y, 'Q', pq.x, pq.y, p2.x, p2.y],
                        {
                            "fill": "none",
                            "stroke": theme.on.path().css_color,
                            "stroke-width": stroke_width,
                            "opacity": theme.on.path().css_opacity
                        }
                    );
                    if ( pcset.has(pc) ) line.setAttribute("marker-end", "url(#arrow)");
                    if ( pcset.has(pci) ) line.setAttribute("marker-start", "url(#arrow)");
                    g_inv_lines.appendChild(line);
                } else if ( ! options.active_paths_only ) {
                    const line = SvgTools.makePath(
                        ['M', p1.x, p1.y, 'Q', pq.x, pq.y, p2.x, p2.y],
                        {
                            "fill": "none",
                            "stroke": theme.off.path().css_color,
                            "stroke-width": stroke_width,
                            "stroke-dasharray": `${dashes.dash_width} ${dashes.space_width}`,
                            "opacity": theme.off.path().css_opacity
                        }
                    );
                    g_inv_lines.appendChild(line);
                }
            }
            this.svg.appendChild(g_inv_lines);
        }
        
        // draw transposition lines
        if ( options.transposition != null ) {
            options.transposition = mod12(options.transposition);
            const g_transp_lines = SvgTools.createGroup();
            if ( pcset.size > 0 && options.inversion == null ) {
                const df = SvgTools.createElement("defs");
                const mk = SvgTools.makeSimpleArrowMarker("arrow", 
                    size / 25 / Math.sqrt(stroke_width), {
                        "fill": theme.on.path().css_color,
                    }
                );
                mk.setAttribute("refX", 9);
                df.appendChild(mk);
                this.svg.appendChild(df);
            }
            const pc_end = (Math.abs(options.transposition) == 6) ? 6 : 12;
            for ( let pc = 0; pc < pc_end; pc++ ) {
                const pct = mod12(pc + options.transposition);
                const pl = computePathLength(pc, pct);
                let offset = (options.transposition == 6) ? 0 : 3;
                if ( options.transposition > 6 ) 
                    offset *= -1;
                if ( options.fifths && options.transposition % 2 != 0 )
                    offset *= -1;
                const p1 = getPoint(pc, pc_axis_distance, +offset);
                const p2 = getPoint(pct, pc_axis_distance, -offset);
                const pm = {
                    x: (p1.x + p2.x) / 2, 
                    y: (p1.y + p2.y) / 2
                }
                let pq = { 
                    x: ( pm.x + (center * 3) ) / 4, 
                    y: ( pm.y + (center * 3) ) / 4
                };
                if ( pl <= 2 ) {
                    pq.x = (pm.x + (pq.x * (pl+1))) / (pl+2);
                    pq.y = (pm.y + (pq.y * (pl+1))) / (pl+2);
                }
                if ( pcset.has(pc) || (pc_end == 6 && pcset.has(pct)) ) {
                    const line = SvgTools.makePath(
                        ['M', p1.x, p1.y, 'Q', pq.x, pq.y, p2.x, p2.y],
                        {
                            "fill": "none",
                            "stroke": theme.on.path().css_color,
                            "stroke-width": stroke_width,
                            "opacity": theme.on.path().css_opacity
                        }
                    );
                    if ( pcset.has(pc) )
                        line.setAttribute("marker-end", "url(#arrow)");
                    if ( options.transposition == 6 && pcset.has(pct) )
                        line.setAttribute("marker-start", "url(#arrow)");
                    g_transp_lines.appendChild(line);
                } else if ( ! options.active_paths_only ) {
                    const line = SvgTools.makePath(
                        ['M', p1.x, p1.y, 'Q', pq.x, pq.y, p2.x, p2.y],
                        {
                            "fill": "none",
                            "stroke": theme.off.path().css_color,
                            "stroke-width": stroke_width,
                            "stroke-dasharray": `${dashes.dash_width} ${dashes.space_width}`,
                            "opacity": theme.off.path().css_opacity
                        }
                    );
                    g_transp_lines.appendChild(line);
                }
            }
            this.svg.appendChild(g_transp_lines);
        }
        
        // draw symmetry axes
        if ( options.symmetry_axes && pcset.size > 0 ) {
            const symmetries = pcset.getInversionalSymmetryAxes();
            const g_axes = SvgTools.createGroup();
            for ( const symmetry of symmetries ) {
                const axis_line = makeAxis(symmetry, true);
                g_axes.appendChild(axis_line);
            }
            this.svg.appendChild(g_axes);
        }

        // draw circles and text
        for ( let pc = 0; pc < 12; pc++ ) {

            const p = getPoint(pc, pc_center_distance);
            const actual_theme = ( pcset.has(pc) ? theme.on : theme.off );
            const text_data = ( options.note_names 
                ? SVG_PATHS_NOTES[pc.toString()] : SVG_PATHS_NUMBERS[pc.toString()] );
    
            const circle_and_text = this.drawCircleWithText(p.x, p.y, pc_radius, stroke_width, 
                actual_theme.circle_stroke(pc), actual_theme.circle_fill(pc),
                text_data, actual_theme.text(pc), (scale-0.05)**1.5, options.show_text ?? "always", 
                pcset.has(pc) || ( options.inversion != null && pcset.invert(options.inversion).has(pc) )
                    || ( options.transposition != null && pcset.transpose(options.transposition).has(pc) )
            );

            this.svg.appendChild(circle_and_text);
        }

    }

    downloadPng(width_height, filename = null) {
        if ( !filename ) filename = this.getStandardFilename("png", "-clockface");
        super.downloadPng(width_height, width_height, filename);
    }
    
    downloadSvg(filename = null) {
        if ( !filename ) filename = this.getStandardFilename("svg", "-clockface");
        super.downloadSvg(filename);
    }

    pngToClipboard(width_height) {
        super.pngToClipboard(width_height, width_height);
    }
    
}


class StaticRulerPcSetView extends PcSetBaseView {

    /**
     * Creates a static ruler-type PcSet representation.
     * @param {PcSet} pcset a pitch-class set object.
     * @param {Object} options optional; accepts the following properties:
     *      * _start_ (Number) - First pitch-class; default is _0_;
     *      * *double_row* (Boolean) - Separate rows for naturals and accidentals;
     *          default is _false_;
     *      * _height_ (Number) - Default is _70_;
     *      * *stroke_width* (Number) - Default is _3_;
     *      * _scale_ (Number) - Default is _1.0_;
     *      * _fn_ (Function) - A function to be called for each component, with
     *          3 arguments: _element_ (a reference to the SVG element), _type_ 
     *          (String, "svg" or "pc") and _index_ (Number, for "pc" the pitch-class
     *          number; for "svg" is zero).
     * @param {String} theme optional; name of a theme.
     */
    constructor(pcset, options = {}, theme = "basic-light") {
        super();

        this.pcset_str = pcset.toString("short-ab", false);
        
        const scale = options.scale ?? 1.0;
        const row_height = ( options.height ?? 85 ) * scale;
        const stroke_width = ( options.stroke_width ?? 3.0 ) * scale;

        theme = PcSetBaseView.getTheme(theme);

        const v_center = row_height/2;
        const pc_diameter = row_height;
        const pc_radius = pc_diameter / 2;
        const pc_gap = pc_radius * 0.05;
        // height of an equilateral triangle: h = x * sqrt(3) / 2
        const row_diff = (options.double_row) ? (pc_diameter+pc_gap) * 0.866 : 0;
        const first_pc = (options.start) ? mod12(options.start) : 0;
        const last_pc = mod12(first_pc+11);
        const total_width = (options.double_row) 
                ? (7*pc_diameter) + (6*pc_gap) + 
                    ( isBlackKey(first_pc) || isBlackKey(last_pc) ? pc_diameter/2 : 0)
                : (12*pc_diameter) + (11*pc_gap);
        const total_height = row_height + row_diff;

        // create root svg element
        this.svg = SvgTools.createRootElement({
            "width": total_width.toString(),
            "height": total_height.toString(),
            "viewbox": [0,0,total_width,row_height].join(" ")
        });

        if ( options.fn ) options.fn(this.svg, "svg", 0);

        // draw circles and text
        const DOUBLE_ROW_FACTORS = [0,0.5,1,1.5,2,3,3.5,4,4.5,5,5.5,6];
        const double_row_factors_shifted = DOUBLE_ROW_FACTORS
                .map((x) => mod(x-DOUBLE_ROW_FACTORS[first_pc],7));
        for ( let i = 0; i < 12; i++ ) {
            const pc = mod12(first_pc+i);
            const py = (options.double_row) 
                ? ( isWhiteKey(pc) ? v_center + row_diff : v_center )
                : v_center;
            const px = pc_radius + ( (options.double_row) 
                ? ( double_row_factors_shifted[pc] * (pc_diameter+pc_gap) )
                : i * (pc_diameter+pc_gap) );

            const actual_theme = ( pcset.has(pc) ? theme.on : theme.off );
            const text_data = ( options.note_names 
                ? SVG_PATHS_NOTES[pc.toString()] : SVG_PATHS_NUMBERS[pc.toString()] );

            const circle_stroke = actual_theme.circle_stroke(pc);

            const text_scale = ( [1,3,6,8,10].includes(pc) && options.note_names )
                ? scale*1.2 : scale*1.35;
    
            const circle_and_text = this.drawCircleWithText(px, py, 
                pc_radius - (circle_stroke.alpha > 0 ? stroke_width : 1), stroke_width, 
                circle_stroke, actual_theme.circle_fill(pc),
                text_data, actual_theme.text(pc), text_scale,
                options.show_text ?? "always", pcset.has(pc)
            );

            this.svg.appendChild(circle_and_text);
            
            if ( options.fn ) options.fn(circle_and_text, "pc", pc);
        }

    }

    downloadPng(height, filename = null) {
        const width = Math.round(parseInt(this.svg.getAttribute("width")) 
                        * height / parseInt(this.svg.getAttribute("height")));
        if ( !filename ) filename = this.getStandardFilename("png", "-ruler");
        super.downloadPng(width, height, filename);
    }

    downloadSvg(filename = null) {
        if ( !filename ) filename = this.getStandardFilename("svg", "-ruler");
        super.downloadSvg(filename);
    }

    pngToClipboard(height) {
        const width = Math.round(parseInt(this.svg.getAttribute("width")) 
                        * height / parseInt(this.svg.getAttribute("height")));
        super.pngToClipboard(width, height);
    }

}


class StaticStaffPcSetView extends PcSetBaseView {

    /**
     * Creates a music score representation of a Pcset.
     * @param {MusicalScale} notes a MusicalScale object;
     * @param {Object} options optional; accepts the following properties:
     *      * _height_ (Number) - Default is _70_;
     *      * _scale_ (Number) - Default is _1.0_;
     *      * _fn_ (Function) - A function to be called for each component, with
     *          3 arguments: _element_ (a reference to the SVG element), _type_ 
     *          (String, "svg" or "pc") and _index_ (Number, for "pc" the pitch-class
     *          number; for "svg" is zero).
     * @param {String} theme optional; name of a theme.
     */
    constructor(notes, options = {}, theme = "basic-light") {
        super();

        theme = PcSetBaseView.getTheme(theme);

        const size = notes.size;

        const clef_str = options.clef ?? "G2";
        const clef_type = clef_str[0].toUpperCase();
        const clef_data = SVG_PATHS_CLEFS[clef_type];
        const clef_line = (clef_str.length > 1) ? parseInt(clef_str[1]) : clef_data.l;
        const clef_translate = clef_data.l - clef_line;
        const notehead = SVG_PATHS_NOTEHEADS[options.notehead ?? "q"];
        const scale = options.scale ?? 1.0;
        const note_width = scale * notehead.w;
        const note_height = scale * notehead.h;
        const staff_spacing = scale * 44.646;
        const staff_line_width = scale * 4.910;
        const supplemental_line_width = staff_line_width * 1.5;
        const staff_height = staff_spacing * 5;
        const staff_min_y_margin = note_height * 3;
        const clef_margin_left = staff_spacing;
        const clef_margin_right = clef_margin_left * 2;
        const clef_width = scale * clef_data.w;
        const clef_height = scale * clef_data.h;
        const note_margin = staff_spacing*1.3;
        const accidental_margin = note_width / 3;
        const clef_y_offset = (scale * clef_data.y) + (staff_spacing * clef_translate);
        const staff_y_offset = Math.max((staff_spacing/2) - clef_y_offset, staff_min_y_margin);
        const clef_y = clef_y_offset + staff_y_offset;
        const staff_bottom_margin = Math.max(staff_min_y_margin - staff_spacing, clef_height - staff_height + clef_y_offset);
        const height = staff_height + staff_y_offset + staff_bottom_margin;
        const black_key_count = notes.notes.reduce((sum,note) => sum + (note.isBlackKey() ? 1 : 0), 0);
        let width = clef_margin_left + clef_width + clef_margin_right 
                + (size * (note_width + note_margin)) + note_margin
                + (black_key_count * (scale * SVG_PATHS_ACCIDENTALS["s"].w + accidental_margin - (note_margin/3)));

        // create root svg element
        this.svg = SvgTools.createRootElement({
            "height": height.toString(),
        });

        if ( options.fn ) options.fn(this.svg, "svg", 0);

        // draw staff
        const staff_g = SvgTools.createGroup();
        for ( let i = 0; i < 5; i++ ) {
            const y = staff_y_offset + (staff_spacing * i);
            const line = SvgTools.makeLine(0, y, 0, y, {"stroke-width": staff_line_width, "stroke": theme.staff().css_color});
            staff_g.appendChild(line);
            if ( options.fn ) options.fn(line, "staff_line", i);
        }
        this.svg.appendChild(staff_g);
        if ( options.fn ) options.fn(staff_g, "staff", 0);

        // draw clef
        const clef = SvgTools.makePath(clef_data.d, {
            "fill": theme.staff().css_color,
            "transform": `translate(${clef_margin_left} ${clef_y}),scale(${scale})`
        });
        this.svg.appendChild(clef);
        if ( options.fn ) options.fn(clef, "clef", 0);

        if ( size > 0 ) {

            notes.makeIdealDistribution();

            if ( options.accidental_swap )
                for ( const note of notes )
                    if ( options.accidental_swap.includes(note.class) )
                        note.swapAccidental();

            notes.adjustToClef(clef_str);

            // draw notes
            const notes_g = SvgTools.createGroup();

            let x = clef_margin_left + clef_width + clef_margin_right;
            let previous_note = notes.note(0);
            for ( const note of notes ) {
                const this_note_g = SvgTools.createGroup();
                const note_element = SvgTools.makePath(notehead.d, {
                    "fill": theme.note_fill(note.class).css_color,
                    "fill-opacity": theme.note_fill(note.class).css_opacity
                });
                if ( (theme.note_stroke(note.class).css_rgba != theme.note_fill(note.class).css_rgba) ) {
                    note_element.setAttribute("stroke", theme.note_stroke(note.class).css_color);
                    note_element.setAttribute("stroke-width", staff_line_width);
                    note_element.setAttribute("paint-order", "fill");
                }
                const pos = note.staffPosition(clef_str) / 2;
                const y = staff_y_offset + staff_height - (pos * staff_spacing) - (note_height / 2);
                if ( note.isAltered() 
                     || ((previous_note.diatonic_index == note.diatonic_index) && previous_note.isAltered() ) ) {
                    // draw accidental
                    x -= (note_margin/3);
                    const acc_data = SVG_PATHS_ACCIDENTALS[
                        (note.accidental == 1) ? "s" : 
                            (note.accidental == -1) ? "f" : "n"
                    ];
                    const acc_symbol = SvgTools.makePath(acc_data.d, {
                        "fill": theme.note_stroke(note.class).css_color,
                        "fill-opacity": theme.note_stroke(note.class).css_opacity,
                    });
                    const acc_y = staff_y_offset + staff_height - (pos * staff_spacing) - (acc_data.h * scale / 2) + (acc_data.y * scale);
                    acc_symbol.setAttribute("transform", `translate(${x} ${acc_y}),scale(${scale})`);
                    x += (acc_data.w * scale) + accidental_margin;
                    this_note_g.appendChild(acc_symbol);
                    previous_note = note;
                    if ( options.fn ) options.fn(acc_symbol, "accidental", note.accidental);
                }
                if ( pos <= 0 || pos >= 6 ) {
                    for ( let j = (pos <= 0 ? 0 : 6); pos <= 0 ? j >= pos : j <= pos; pos <= 0 ? j-- : j++ ) {
                        // draw supplemental line
                        const y = staff_y_offset + (staff_spacing * (5-j));
                        const line = SvgTools.makeLine(
                            x - (note_margin/4), y, 
                            x + (notehead.w*scale) + (note_margin/4), y,
                            { "stroke": theme.staff().css_color, "stroke-width": supplemental_line_width }
                        );
                        this_note_g.appendChild(line);
                    }
                }
                note_element.setAttribute("transform", `translate(${x} ${y}),scale(${scale})`);
                this_note_g.appendChild(note_element);
                notes_g.appendChild(this_note_g);
                if ( options.fn ) {
                    options.fn(note_element, "notehead", note.class);
                    options.fn(this_note_g, "note", note.class);
                }

                x += note_width + note_margin;
                width = x + (staff_spacing / 2);
            }

            this.svg.appendChild(notes_g);

        }    

        // draw barline
        if ( options.barline && options.barline != "none" ) {
            width += staff_spacing / 2;
            const barline_g = SvgTools.createGroup();
            const thin_barline_width = staff_spacing * 0.18;
            const barline_gap = staff_spacing * 0.37;
            //width += note_margin / 2;

            function drawBarline(x, stroke_width) {
                const barline = SvgTools.makeLine(
                    x, staff_y_offset - (staff_line_width / 2), 
                    x, staff_y_offset + (staff_spacing * 4) + (staff_line_width / 2), 
                    { "stroke": theme.staff().css_color, "stroke-width": stroke_width }
                );
                barline_g.appendChild(barline);
            }

            switch ( options.barline ) {
                case "single":
                    drawBarline(width - (thin_barline_width / 2), thin_barline_width);
                    break;
                case "double":
                    drawBarline(width - (thin_barline_width / 2), thin_barline_width);
                    width += barline_gap + thin_barline_width;
                    drawBarline(width - (thin_barline_width / 2), thin_barline_width);
                    break;
                case "final":
                    drawBarline(width - (thin_barline_width / 2), thin_barline_width);
                    const strong_barline_width = staff_spacing * 0.55;
                    width += barline_gap + strong_barline_width;
                    drawBarline(width - (strong_barline_width / 2), strong_barline_width);
                    break;                
            }
            this.svg.appendChild(barline_g);
        }
        
        // adjust width
        for ( const line of staff_g.childNodes )
            line.setAttribute("x2", width);
        this.svg.setAttribute("width", width.toString());
        this.svg.setAttribute("viewbox", [0,0,width,height].join(" "));

    }

    downloadPng(height, filename = null) {
        const width = Math.round(parseInt(this.svg.getAttribute("width")) 
                        * height / parseInt(this.svg.getAttribute("height")));
        if ( !filename ) filename = this.getStandardFilename("png", "-staff");
        super.downloadPng(width, height, filename);
    }

    downloadSvg(filename = null) {
        if ( !filename ) filename = this.getStandardFilename("svg", "-staff");
        super.downloadSvg(filename);
    }

    pngToClipboard(height) {
        const width = Math.round(parseInt(this.svg.getAttribute("width")) 
                        * height / parseInt(this.svg.getAttribute("height")));
        super.pngToClipboard(width, height);
    }

}


class StaticTonnetzPcSetView extends PcSetBaseView {

    /**
     * Creates a static tonnetz-type PcSet representation.
     * @param {PcSet} pcset a pitch-class set object.
     * @param {Object?} options
     * @param {Number?} options.width - Default is _6_
     * @param {Number?} options.height - Default is _5_
     * @param {Number?} options.h_cut - Default is _0_
     * @param {Number?} options.centerpc - Default is _0_
     * @param {Number?} options.scale - Default is _1.0_
     * @param {Number?} options.stroke_width - Default is _3.0_
     * @param {Boolean?} options.show_text
     * @param {Boolean?} options.fill_faces
     * @param {Boolean?} options.all_vertices
     * @param {Boolean?} options.all_edges
     * @param {Boolean?} options.extended_edges
     * @param {Function?} options.fn- A function to be called for each component, with
     *      3 arguments: _element_ (a reference to the SVG element), _type_ 
     *      (String, "svg" or "pc") and _index_ (Number, for "pc" the pitch-class
     *      number; for "svg" is zero).
     * @param {String} theme optional; name of a theme.
     */
    constructor(pcset, options = {}, theme = "basic-light") {
        super();

        this.pcset_str = pcset.toString("short-ab", false);

        const size = options.size ?? 500;
        const scale = (options.scale ?? 1.0)**1.5;
        const h_count = options.width ?? 6;
        const v_count = options.height ?? 5;
        const bottom_right_edge_sum = h_count + v_count - 2;
        const h_cut = options.h_cut ?? 0;
        const centerpc = options.centerpc ?? 0;
        const cornerpc = (centerpc + (Math.trunc((h_count-1)/2) * 5) + (Math.ceil((v_count-1)/2) * 8)) % 12;

        let stroke_width = ( options.stroke_width ?? 3.0 ) * scale / 150;

        theme = PcSetBaseView.getTheme(theme);

        let h = 0.866025403784; // triangle height
        const circle_unit_diameter = scale/1.8 - (stroke_width/2);
        let r = circle_unit_diameter/2; //circle radius
        const total_unit_height = h*(v_count-1) + circle_unit_diameter + stroke_width*2;
        const total_unit_width = (h_count-1-h_cut) + (v_count-1)/2 + circle_unit_diameter + stroke_width*2;
        const size_ratio = total_unit_width / total_unit_height;
        let topleft_center_y = r + stroke_width;
        let topleft_center_x = topleft_center_y - (h_cut * h / Math.sqrt(3));
        const largest_unit_size = Math.max(total_unit_height, total_unit_width);
        const final_scaling_factor = size / largest_unit_size;

        let [total_width, total_height] = ( size_ratio > 1 ) 
            ? [size, size/total_unit_width*total_unit_height]
            : [size/total_unit_height*total_unit_width, size];

        // create root svg element
        this.svg = SvgTools.createRootElement();

        if ( options.fn ) options.fn(this.svg, "svg", 0);

        const g_vertices = SvgTools.createGroup();
        const g_edges = SvgTools.createGroup();
        const g_faces = SvgTools.createGroup();
        this.svg.appendChild(g_faces);
        this.svg.appendChild(g_edges);
        this.svg.appendChild(g_vertices);

        // Scale dimensions
        stroke_width *= final_scaling_factor;
        h *= final_scaling_factor;
        r *= final_scaling_factor;
        topleft_center_y *= final_scaling_factor;
        topleft_center_x *= final_scaling_factor;

        const text_scale = scale/110*final_scaling_factor;

        const rsin60 = Math.sin(1.0471975512) * r;
        const rcos60 = Math.cos(1.0471975512) * r;

        if ( options.extended_edges ) {
            const h_extend = final_scaling_factor - 2*r;
            const v_extend = final_scaling_factor - 2*r;
            total_width += 2 * h_extend;
            total_height += 2 * v_extend;
            topleft_center_x += h_extend;
            topleft_center_y += v_extend;
        }

        this.svg.setAttribute("width", total_width.toString());
        this.svg.setAttribute("height", total_height.toString());
        this.svg.setAttribute("viewbox", [
            0, 0, total_width, total_height
        ].join(" "));

        const X = (x,y) => final_scaling_factor * (x + (y/2)) + topleft_center_x;
        const Y = (y) => y*h + topleft_center_y;
        const PC = (x,y) => (cornerpc + (x*7) + (y*4)) % 12;

        const connector_off_attr = {
            "stroke": theme.off.tnz_connector().css_color, 
            "stroke-opacity": theme.off.tnz_connector().css_opacity,
            "stroke-width": stroke_width
        };
        const connector_on_attr = {
            "stroke": theme.on.tnz_connector().css_color, 
            "stroke-opacity": theme.on.tnz_connector().css_opacity,
            "stroke-width": stroke_width*4
        };
        const triangle_attr = {
            "fill": theme.triangle_fill().css_color,
            "fill-opacity": theme.triangle_fill().css_opacity
        };

        const isInside = (x,y) => {
            return (x >= 0) && (y >= 0) && (x < h_count) && (y < v_count)
                && (x+y >= h_cut) && (x+y <= bottom_right_edge_sum-h_cut);
        };

        // Draw Tonnetz
        for ( let y = 0; y < v_count; y++ ) {
            for ( let x = 0; x < h_count; x++ ) {

                if ( !isInside(x, y) ) continue;

                const pc = PC(x,y);
                const px = X(x,y);
                const py = Y(y);

                const pcs = {
                    me: { has: pcset.has(pc) },
                    p5: { has: pcset.has((pc+7)%12) },
                    p4: { has: pcset.has((pc+5)%12) },
                    maj3: { has: pcset.has((pc+4)%12) },
                    min6: { has: pcset.has((pc+8)%12) },
                    min3: { has: pcset.has((pc+3)%12) },
                    maj6: { has: pcset.has((pc+9)%12) }
                }

                for ( const item of Object.values(pcs) )
                    item.visible = item.has || options.all_vertices;

                const edges = {
                    p5: { strong: pcs.me.has && pcs.p5.has },
                    p4: { strong: pcs.me.has && pcs.p4.has },
                    maj3: { strong: pcs.me.has && pcs.maj3.has },
                    min6: { strong: pcs.me.has && pcs.min6.has },
                    min3: { strong: pcs.me.has && pcs.min3.has },
                    maj6: { strong: pcs.me.has && pcs.maj6.has }
                }

                for ( const item of Object.values(edges) )
                    item.visible = item.strong || options.all_edges;

                // draw filled faces
                if ( options.fill_faces && pcs.me.has && triangle_attr["fill-opacity"] != '0' ) {
                    if ( isInside(x,y-1) && isInside(x+1,y-1) && pcs.min3.has && pcs.min6.has ) {
                        const [ax,ay] = [px + rcos60        , py - rsin60    ];
                        const [bx,by] = [X(x+1,y-1) - rcos60, Y(y-1) + rsin60];
                        const [cx,cy] = [X(x+1,y-1) - r     , Y(y-1)         ];
                        const [dx,dy] = [X(x,y-1) + r       , cy             ];
                        const [ex,ey] = [X(x,y-1) + rcos60  , by             ];
                        const [fx,fy] = [px - rcos60        , ay             ];
                        const triangle_up = SvgTools.makePath([
                            'M', bx, by,
                            'A', r, r, 0, 0, 1, cx, cy,
                            'L', dx, dy,
                            'A', r, r, 0, 0, 1, ex, ey,
                            'L', fx, fy,
                            'A', r, r, 0, 0, 1, ax, ay,
                            'Z'
                        ], triangle_attr);
                        g_faces.appendChild(triangle_up);
                        if ( options.fn ) options.fn(triangle_up, "face", 0);
                    }
                    if ( isInside(x-1,y+1) && isInside(x,y+1) && pcs.maj3.has && pcs.maj6.has ) {
                        const [ax,ay] = [px + rcos60        , py + rsin60    ];
                        const [bx,by] = [X(x+1,y-1) - rcos60, Y(y+1) - rsin60];
                        const [cx,cy] = [X(x+1,y-1) - r     , Y(y+1)         ];
                        const [dx,dy] = [X(x,y-1) + r       , cy             ];
                        const [ex,ey] = [X(x,y-1) + rcos60  , by             ];
                        const [fx,fy] = [px - rcos60        , ay             ];
                        const triangle_down = SvgTools.makePath([
                            'M', bx, by,
                            'A', r, r, 0, 0, 0, cx, cy,
                            'L', dx, dy,
                            'A', r, r, 0, 0, 0, ex, ey,
                            'L', fx, fy,
                            'A', r, r, 0, 0, 0, ax, ay,
                            'Z'
                        ], triangle_attr);
                        g_faces.appendChild(triangle_down);
                        if ( options.fn ) options.fn(triangle_down, "face", 0);
                    }
                }
                
                const drawEdge = (x1, y1, x2, y2, strong) => {
                    const line = SvgTools.makeLine(x1, y1, x2, y2,
                        ( strong ? connector_on_attr : connector_off_attr ));
                    g_edges.appendChild(line);
                    if ( options.fn ) options.fn(line, "edge", 0);
                };
                    
                // draw inner edges
                if ( edges.p5.visible && isInside(x+1,y) ) {
                    const [ax,ay] = [px + (pcs.me.visible?r:0), py];
                    const [bx,by] = [X(x+1,y) - (pcs.p5.visible?r:0), ay];
                    drawEdge(ax, ay, bx, by, edges.p5.strong);
                }
                if ( edges.maj3.visible && isInside(x,y+1) ) {
                    const [ax,ay] = [px + (pcs.me.visible?rcos60:0), py + (pcs.me.visible?rsin60:0)];
                    const [bx,by] = [X(x,y+1) - (pcs.maj3.visible?rcos60:0), Y(y+1) - (pcs.maj3.visible?rsin60:0)];
                    drawEdge(ax, ay, bx, by, edges.maj3.strong);
                }
                if ( edges.maj6.visible && isInside(x-1,y+1) ) {
                    const [ax,ay] = [px - (pcs.me.visible?rcos60:0), py + (pcs.me.visible?rsin60:0)];
                    const [bx,by] = [X(x-1,y+1) + (pcs.maj6.visible?rcos60:0), Y(y+1) - (pcs.maj6.visible?rsin60:0)];
                    drawEdge(ax, ay, bx, by, edges.maj6.strong);
                }

                // draw extended edges
                if ( options.extended_edges ) {
                    if ( edges.p4.visible && (x == 0 || (x+y == h_cut)) ) {
                        const [ax,ay] = [px - (pcs.me.visible?r:0), py];
                        const [bx,by] = [X(x-1,y) + r, ay];
                        drawEdge(ax, ay, bx, by, edges.p4.strong);
                    }
                    if ( edges.p5.visible && 
                            (x == h_count-1 || (x+y == bottom_right_edge_sum - h_cut)) ) {
                        const [ax,ay] = [px + (pcs.me.visible?r:0), py];
                        const [bx,by] = [X(x+1,y) - r, ay];
                        drawEdge(ax, ay, bx, by, edges.p5.strong);
                    }
                    if ( edges.maj6.visible && ((x == 0 && y < v_count-1) || y == v_count-1) ) {
                        const [ax,ay] = pcs.me.visible? [px-rcos60, py+rsin60] : [px,py];
                        const [bx,by] = [X(x-1,y+1) + rcos60, Y(y+1) - rsin60];
                        drawEdge(ax, ay, bx, by, edges.maj6.strong);
                    }
                    if ( edges.min3.visible && ((x == h_count-1 && y > 0) || y == 0) ) {
                        const [ax,ay] = pcs.me.visible ? [px+rcos60, py-rsin60] : [px,py];
                        const [bx,by] = [X(x+1,y-1) - rcos60, Y(y-1) + rsin60];
                        drawEdge(ax, ay, bx, by, edges.min3.strong);
                    }
                    if ( edges.min6.visible && (y == 0 || x+y == h_cut) ) {
                        const [ax,ay] = pcs.me.visible ? [px-rcos60, py-rsin60] : [px,py];
                        const [bx,by] = [X(x,y-1) + rcos60, Y(y-1) + rsin60];
                        drawEdge(ax, ay, bx, by, edges.min6.strong);
                    }
                    if ( edges.maj3.visible && 
                            (y == v_count-1 || x+y == bottom_right_edge_sum - h_cut) ) {
                        const [ax,ay] = pcs.me.visible ? [px+rcos60, py+rsin60] : [px,py];
                        const [bx,by] = [X(x,y+1) - rcos60, Y(y+1) - rsin60];
                        drawEdge(ax, ay, bx, by, edges.maj3.strong);
                    }
                }

                // draw vertex
                if ( options.all_vertices || pcs.me.has ) {
                    const actual_theme = ( pcs.me.has ? theme.on : theme.off );
                    const text_data = ( options.note_names 
                        ? SVG_PATHS_NOTES[pc.toString()] : SVG_PATHS_NUMBERS[pc.toString()] );
        
                    const circle_and_text = this.drawCircleWithText(px, py, r, stroke_width,
                        actual_theme.circle_stroke(pc), actual_theme.circle_fill(pc),
                        text_data, actual_theme.text(pc), 
                        ( [1,3,6,8,10].includes(pc) && options.note_names ) ? text_scale*0.9 : text_scale,
                        options.show_text ?? "always", pcs.me.has
                    );
        
                    g_vertices.appendChild(circle_and_text);
                    if ( options.fn ) options.fn(circle_and_text, "pc", pc);
                }

            }
        }

    }

    downloadPng(size, filename = null) {
        const width = parseInt(this.svg.getAttribute("width"));
        const height = parseInt(this.svg.getAttribute("height"));
        const scale = size / Math.max(width, height);
        if ( !filename ) filename = this.getStandardFilename("png", "-tonnetz");
        super.downloadPng(width*scale, height*scale, filename);
    }

    downloadSvg(filename = null) {
        if ( !filename ) filename = this.getStandardFilename("svg", "-tonnetz");
        super.downloadSvg(filename);
    }

    pngToClipboard(size) {
        const width = parseInt(this.svg.getAttribute("width"));
        const height = parseInt(this.svg.getAttribute("height"));
        const scale = size / Math.max(width, height);
        super.pngToClipboard(width*scale, height*scale);
    }
}


function rgbf(r,g,b) { return () => rgb(r,g,b); }
function rgbaf(r,g,b,a) { return () => rgba(r,g,b,a); }
function hslf(h,s,l) { return () => hsl(h,s,l); }
function hslaf(h,s,l,a) { return () => hsla(h,s,l,a); }

/**
 * @param {Object} params - Accepts the following properties:
 *      *l* - lightness, 0.0 to 1.0;
 *      *s* - saturation, 0.0 to 1.0;
 *      *a* - alpha (opacity), 0.0 to 1.0.
 * @returns {Function(pc)} - A function that accepts a pitch-class.
 */
function pcToHueF(params = {}) { 
    return (pc=0) => lcha(
        params.l ?? 0.5,
        params.s ? params.s/2 : 0.4,
        30*pc+30,
        params.a ?? 1
    ); 
}

function blackf(a=1) { return () => black(a); }
function whitef(a=1) { return () => white(a); }

function hslaf(h, params = {}) { 
    return () => hsla(h, params.s ?? 1, params.l ?? 0.5, params.a ?? 1);
}

function redf(params = {}) { return hslaf(0, params); }
function greenf(params = {}) { return hslaf(120, params); }
function bluef(params = {}) { return hslaf(240, params); }


const GRAPHICS_THEMES = {
    "basic-light": { 
        bg_type: "light", fg: blackf(), bg: transparent, triangle_fill: blackf(0.2)
    },
    "basic-light-red": { 
        bg_type: "light", fg: redf(), bg: transparent, 
        text: blackf(), path: blackf(), note_stroke: black, triangle_fill: blackf(0.2)
    },
    "basic-light-green": { 
        bg_type: "light", fg: greenf({l:0.25}), bg: nocolor, text: blackf(), path: blackf(),
        note_stroke: black, triangle_fill: blackf(0.2)
    },
    "basic-light-blue": { 
        bg_type: "light", fg: bluef(), bg: nocolor, text: blackf(), path: blackf(),
        note_stroke: black, triangle_fill: blackf(0.2)
    },
    "basic-light-colorful": { 
        bg_type: "light", fg: pcToHueF({l:0.4}), bg: nocolor, text: blackf(), path: blackf(), 
        polygon_stroke: blackf(), note_fill: pcToHueF({l:0.6}), note_stroke: black, 
        triangle_fill: blackf(0.2)
    },
    "basic-dark": { 
        bg_type: "dark", fg: whitef(), bg: nocolor, triangle_fill: whitef(0.2)
    },
    "basic-dark-red": { 
        bg_type: "dark", fg: redf({l:0.75}), bg: nocolor, text: whitef(), path: whitef(), 
        note_fill: redf(), note_stroke: white, triangle_fill: whitef(0.2)
    },
    "basic-dark-green": { 
        bg_type: "dark", fg: greenf({l:0.6}), bg: nocolor, text: whitef(), path: whitef(), 
        note_fill: greenf(), note_stroke: white, triangle_fill: whitef(0.2)
    },
    "basic-dark-blue": { 
        bg_type: "dark", fg: bluef({l:0.75}), bg: nocolor, text: whitef(), path: whitef(), 
        note_fill: bluef(), note_stroke: white, triangle_fill: whitef(0.2)
    },
    "basic-dark-colorful": { 
        bg_type: "dark", fg: pcToHueF({l:0.9}), bg: nocolor, text: whitef(), path: whitef(),
        polygon_stroke: whitef(), note_fill: pcToHueF({l:0.7}), note_stroke: white, 
        triangle_fill: whitef(0.2)
    },
    "soft-light": {
        bg_type: "light", fg: blackf(), bg: nocolor, circle_stroke: nocolor, circle_fill: blackf(0.2),
        polygon_stroke: blackf(0.4), polygon_fill: blackf(0.1), path: blackf(0.5), 
        off: { tnz_connector: blackf(0.3), text: blackf(0.5), path: blackf(0.3) }
    },
    "soft-light-red": {
        bg_type: "light", fg: blackf(), bg: nocolor, circle_stroke: nocolor, circle_fill: redf({a:0.2}),
        polygon_stroke: redf({a:0.4}), polygon_fill: redf({a:0.1}), path: blackf(0.5), 
        off: { tnz_connector: blackf(0.3), text: blackf(0.5), path: blackf(0.3) }
    },
    "soft-light-green": {
        bg_type: "light", fg: blackf(), bg: nocolor, circle_stroke: nocolor, circle_fill: greenf({a:0.15,l:0.15}),
        polygon_stroke: greenf({a:0.4,l:0.25}), polygon_fill: greenf({a:0.1,l:0.25}), path: blackf(0.5), 
        off: { tnz_connector: blackf(0.3), text: blackf(0.5), path: blackf(0.3) }
    },
    "soft-light-blue": {
        bg_type: "light", fg: blackf(), bg: nocolor, circle_stroke: nocolor, circle_fill: bluef({a:0.2}),
        polygon_stroke: bluef({a:0.4}), polygon_fill: bluef({a:0.1}), path: blackf(0.5), 
        off: { tnz_connector: blackf(0.3), text: blackf(0.5), path: blackf(0.3) }
    },
    "soft-light-colorful": {
        bg_type: "light", fg: blackf(), bg: nocolor, circle_stroke: nocolor, circle_fill: pcToHueF({l:0.6,a:0.3}),
        polygon_stroke: blackf(0.4), polygon_fill: blackf(0.1), path: blackf(0.5), 
        off: { tnz_connector: blackf(0.3), text: blackf(0.5), path: blackf(0.3) }
    },
    "soft-dark": {
        bg_type: "dark", fg: whitef(), bg: nocolor, circle_stroke: nocolor, circle_fill: whitef(0.2),
        polygon_stroke: whitef(0.5), polygon_fill: whitef(0.1), path: whitef(0.8), 
        off: { tnz_connector: whitef(0.4), text: whitef(0.8), path: whitef(0.4) }
    },
    "soft-dark-red": {
        bg_type: "dark", fg: whitef(), bg: nocolor, circle_stroke: nocolor, circle_fill: redf({a:0.4,l:0.75}),
        polygon_stroke: redf({a:0.5,l:0.75}), polygon_fill: redf({a:0.1,l:0.75}), path: whitef(0.8), 
        off: { tnz_connector: whitef(0.4), text: whitef(0.8), path: whitef(0.4) }
    },
    "soft-dark-green": {
        bg_type: "dark", fg: whitef(), bg: nocolor, circle_stroke: nocolor, circle_fill: greenf({a:0.4,l:0.6}),
        polygon_stroke: greenf({a:0.5,l:0.6}), polygon_fill: greenf({a:0.1,l:0.6}), path: whitef(0.8), 
        off: { tnz_connector: whitef(0.4), text: whitef(0.8), path: whitef(0.4) }
    },
    "soft-dark-blue": {
        bg_type: "dark", fg: whitef(), bg: nocolor, circle_stroke: nocolor, circle_fill: bluef({a:0.4,l:0.75}),
        polygon_stroke: bluef({a:0.5,l:0.75}), polygon_fill: bluef({a:0.1,l:0.75}), path: whitef(0.8), 
        off: { tnz_connector: whitef(0.4), text: whitef(0.8), path: whitef(0.4) }
    },
    "soft-dark-colorful": {
        bg_type: "dark", fg: whitef(), bg: nocolor, circle_stroke: nocolor, circle_fill: pcToHueF({l:0.7,a:0.3}),
        polygon_stroke: whitef(0.5), polygon_fill: whitef(0.1), path: whitef(0.8), 
        off: { tnz_connector: whitef(0.4), text: whitef(0.8), path: whitef(0.4) }
    },
    "hard-light": {
        bg_type: "light", fg: blackf(), bg: nocolor, circle_stroke: blackf(), circle_fill: blackf(), 
        polygon_stroke: blackf(), polygon_fill: blackf(0.25), on: { text: whitef() }, off: { circle_stroke: blackf() }
    },
    "hard-light-colorful": {
        bg_type: "light", fg: blackf(), bg: nocolor, circle_stroke: blackf(), circle_fill: pcToHueF({l:0.4}), 
        polygon_stroke: blackf(), polygon_fill: blackf(0.25), on: { text: whitef() }, off: { circle_stroke: blackf() }
    },
    "hard-light-red": {
        bg_type: "light", fg: blackf(), bg: nocolor, circle_stroke: blackf(), circle_fill: redf({l:0.4}),
        polygon_stroke: blackf(), polygon_fill: redf({l:0.4}), triangle_fill: redf({l:0.4,a:0.5}), 
        on: { text: whitef() }, off: { circle_stroke: blackf() }
    },
    "hard-light-green": {
        bg_type: "light", fg: blackf(), bg: nocolor, circle_stroke: blackf(), circle_fill: greenf({l:0.25}),
        polygon_stroke: blackf(), polygon_fill: greenf({l:0.25}), triangle_fill: greenf({l:0.25,a:0.5}), 
        on: { text: whitef() }, off: { circle_stroke: blackf() }
    },
    "hard-light-blue": {
        bg_type: "light", fg: blackf(), bg: nocolor, circle_stroke: blackf(), circle_fill: bluef({l:0.4}),
        polygon_stroke: blackf(), polygon_fill: bluef({l:0.4}), triangle_fill: bluef({l:0.4,a:0.5}),
        on: { text: whitef() }, off: { circle_stroke: blackf() }
    },
    "hard-dark": {
        bg_type: "dark", fg: whitef(), bg: nocolor, circle_stroke: whitef(), circle_fill: whitef(),
        polygon_stroke: whitef(), polygon_fill: whitef(0.25), on: { text: blackf() }, off: { circle_stroke: whitef() }
    },
    "hard-dark-colorful": {
        bg_type: "dark", fg: whitef(), bg: nocolor, circle_stroke: whitef(), circle_fill: pcToHueF({l:0.8}),
        polygon_stroke: whitef(), polygon_fill: whitef(0.25), on: { text: blackf() }, off: { circle_stroke: whitef() }
    },
    "hard-dark-red": {
        bg_type: "dark", fg: whitef(), bg: nocolor, circle_stroke: whitef(), circle_fill: redf({l:0.4}), 
        polygon_stroke: whitef(), polygon_fill: redf({l:0.4}), triangle_fill: redf({l:0.4,a:0.5}), 
        off: { circle_stroke: whitef() }
    },
    "hard-dark-green": {
        bg_type: "dark", fg: whitef(), bg: nocolor, circle_stroke: whitef(), circle_fill: greenf({l:0.25}),
        polygon_stroke: whitef(), polygon_fill: greenf({l:0.25}), triangle_fill: greenf({l:0.25,a:0.5}), 
        on: { text: whitef() }, off: { circle_stroke: whitef() }
    },
    "hard-dark-blue": {
        bg_type: "dark", fg: whitef(), bg: nocolor, circle_stroke: whitef(), circle_fill: bluef({l:0.4}),
        polygon_stroke: whitef(), polygon_fill: bluef({l:0.4}), triangle_fill: bluef({l:0.4,a:0.5}), 
        off: { circle_stroke: whitef() }
    },
    "solid-light": {
        bg_type: "light", fg: blackf(), bg: nocolor, circle_stroke: nocolor, circle_fill: blackf(), path: blackf(),
        polygon_stroke: nocolor, polygon_fill: blackf(0.4), on: { text: whitef() }, 
        off: { tnz_connector: blackf(0.2), circle_fill: blackf(0.2), path: blackf(0.4) }
    },
    "solid-light-colorful": {
        bg_type: "light", fg: blackf(), bg: nocolor, circle_stroke: nocolor, circle_fill: pcToHueF(), 
        polygon_stroke: nocolor, polygon_fill: blackf(0.4), path: blackf(), on: { text: whitef() }, 
        off: { tnz_connector: blackf(0.2), text: blackf(), circle_fill: blackf(0.2), path: blackf(0.4) }
    },
    "solid-light-red": {
        bg_type: "light", fg: blackf(), bg: nocolor, circle_stroke: nocolor, circle_fill: redf({l:0.4}), 
        polygon_stroke: nocolor, polygon_fill: redf({l:0.4}), path: blackf(), 
        triangle_fill: redf({a: 0.3, l:0.4}), on: { text: whitef(), path: redf({l: 0.4}) }, 
        off: { tnz_connector: blackf(0.2), text: blackf(), circle_fill: blackf(0.2), path: blackf(0.4) }
    },
    "solid-light-green": {
        bg_type: "light", fg: blackf(), bg: nocolor, circle_stroke: nocolor, circle_fill: greenf({l:0.25}), 
        polygon_stroke: nocolor, polygon_fill: greenf({l:0.25}), path: blackf(),
        triangle_fill: greenf({a: 0.3, l:0.25}), on: { text: whitef(), path: greenf({l: 0.25}) }, 
        off: { tnz_connector: blackf(0.2), text: blackf(), circle_fill: blackf(0.2), path: blackf(0.4) }
    },
    "solid-light-blue": {
        bg_type: "light", fg: blackf(), bg: nocolor, circle_stroke: nocolor, circle_fill: bluef({l:0.4}), 
        polygon_stroke: nocolor, polygon_fill: bluef({l:0.4}), path: blackf(),
        triangle_fill: bluef({a: 0.3, l:0.4}), on: { text: whitef(), path: bluef({l: 0.4}) }, 
        off: { tnz_connector: blackf(0.2), text: blackf(), circle_fill: blackf(0.2), path: blackf(0.4) }
    },
    "solid-dark": {
        bg_type: "dark", fg: whitef(), bg: nocolor, circle_stroke: nocolor, circle_fill: whitef(), 
        polygon_stroke: nocolor, polygon_fill: whitef(0.4), on: { text: blackf() }, 
        off: { tnz_connector: whitef(0.2), circle_fill: whitef(0.2), path: whitef(0.4) }
    },
    "solid-dark-colorful": {
        bg_type: "dark", fg: whitef(), bg: nocolor, circle_stroke: nocolor, circle_fill: pcToHueF({l:0.8}), 
        polygon_stroke: nocolor, polygon_fill: whitef(0.4), path: whitef(),
        on: { text: blackf() }, off: { tnz_connector: whitef(0.2), text: whitef(), circle_fill: whitef(0.2), path: whitef(0.4) }
    },
    "solid-dark-red": {
        bg_type: "dark", fg: whitef(), bg: nocolor, circle_stroke: nocolor, circle_fill: redf({l: 0.4}), 
        polygon_stroke: nocolor, polygon_fill: redf({l: 0.4}), path: whitef(), triangle_fill: redf({a: 0.3, l:0.4}),
        on: { text: whitef() }, off: { tnz_connector: whitef(0.2), text: whitef(), circle_fill: whitef(0.2), path: whitef(0.4) }
    },
    "solid-dark-green": {
        bg_type: "dark", fg: whitef(), bg: nocolor, circle_stroke: nocolor, circle_fill: greenf({l:0.25}), 
        polygon_stroke: nocolor, polygon_fill: greenf({l:0.25}), path: whitef(), triangle_fill: greenf({a: 0.3, l:0.25}),
        on: { text: whitef() }, off: { tnz_connector: whitef(0.2), text: whitef(), circle_fill: whitef(0.2), path: whitef(0.4) }
    },
    "solid-dark-blue": {
        bg_type: "dark", fg: whitef(), bg: nocolor, circle_stroke: nocolor, circle_fill: bluef({l: 0.4}), 
        polygon_stroke: nocolor, polygon_fill: bluef({l: 0.4}), path: whitef(), triangle_fill: bluef({a: 0.3, l:0.4}),
        on: { text: whitef() }, off: { tnz_connector: whitef(0.2), text: whitef(), circle_fill: whitef(0.2), path: whitef(0.4) }
    },
}


const SVG_PATHS_NUMBERS = {
    "0" : { w: 16.460938, h: 26.644043, d: "m 8.293457,1.0708008 q -0.6298828,0 -1.2387695,0.3149414 Q 6.4458008,1.7006836 5.7739258,2.6035156 5.1020508,3.5063477 4.5981445,4.8920898 4.1152344,6.277832 3.800293,8.6503906 3.4853516,11.001953 3.4853516,14.046387 q 0,1.238769 0.1259765,2.645508 0.1259766,1.406738 0.4619141,3.023437 0.3569336,1.616699 0.8608398,2.897461 0.5039063,1.259766 1.34375,2.120605 0.8398438,0.839844 1.8896485,0.839844 0.2939453,0 0.6298828,-0.06299 0.3359375,-0.06299 0.8608398,-0.293945 0.5249019,-0.251954 0.9658199,-0.629883 0.461915,-0.398926 0.902832,-1.154785 0.461915,-0.75586 0.734864,-1.763672 0.713867,-2.666504 0.713867,-9.280274 0,-4.0312497 -0.818848,-6.8447263 Q 11.337891,2.7294922 10.225098,1.8056641 9.4272461,1.0708008 8.293457,1.0708008 Z M 8.1254883,26.644043 q -2.3515625,0 -4.241211,-1.805664 Q 2.015625,23.011719 1.0078125,20.05127 0,17.069824 0,13.584473 0,11.085938 0.44091797,8.9023438 0.90283203,6.71875 1.6796875,5.1230469 2.4775391,3.5063477 3.5273438,2.3515625 4.5771484,1.1757812 5.7949219,0.58789062 7.0126953,0 8.293457,0 q 1.82666,0 2.981445,0.69287109 1.154786,0.69287111 2.267578,2.14160161 2.918457,3.8632812 2.918457,10.3510743 0,2.897461 -0.566894,5.270019 -0.545898,2.351563 -1.406738,3.842286 -0.86084,1.490722 -1.994629,2.498535 -1.133789,1.007812 -2.225586,1.427734 -1.091797,0.419922 -2.1416017,0.419922 z" },
    "1" : { w: 12.240723, h: 26.434076, d: "m 8.3144531,21.541992 q 0.041992,0.923828 0.1049805,1.532715 0.062988,0.587891 0.2519531,1.049805 0.209961,0.440918 0.4199219,0.671875 0.2099609,0.230957 0.6928711,0.377929 0.4829103,0.146973 0.9448243,0.188965 0.461914,0.04199 1.322754,0.08398 0.188965,0.188964 0.188965,0.503906 0,0.293945 -0.188965,0.48291 -0.96582,-0.021 -2.5195314,-0.125977 -1.5327149,-0.08398 -2.6035157,-0.08398 -1.1547851,0 -2.8344726,0.08398 -1.6796875,0.104981 -2.5825196,0.125977 -0.1889648,-0.188965 -0.1889648,-0.48291 0,-0.314942 0.1889648,-0.503906 0.8608399,-0.04199 1.322754,-0.08398 0.461914,-0.04199 0.9448242,-0.188965 0.4829101,-0.146972 0.6928711,-0.377929 0.2099609,-0.230957 0.3989257,-0.671875 0.209961,-0.461914 0.2729493,-1.049805 0.062988,-0.608887 0.1049804,-1.532715 0.062988,-1.910644 0.062988,-7.327637 0,-5.6269527 -0.062988,-7.5585933 Q 5.2070312,5.375 5.0390625,4.7661133 4.8710937,4.1572266 4.3881836,4.1572266 q -1.1337891,0 -3.73730469,1.0917968 Q 0.06298828,4.8710937 0,4.3041992 5.5429687,1.7216797 8.3144531,0 8.5664063,0 8.5664063,0.20996094 8.4824219,1.0288086 8.3144531,5.9628906 q -0.062988,1.9106446 -0.062988,7.7895504 0,5.878907 0.062988,7.789551 z" },
    "2" : { w: 15.096191, h: 26.308105, d: "M 0,6.1098633 Q 0,5.1020508 0.48291016,4.0522461 0.96582031,3.0024414 1.8476562,2.0996094 2.7294922,1.1757812 4.1572266,0.58789062 5.605957,0 7.3066406,0 q 1.3647461,0 2.6875,0.37792969 1.3227544,0.37792968 2.4565434,1.13378901 1.154785,0.7558594 1.847656,2.0576172 0.713867,1.3017578 0.713867,2.9604493 0,1.1757812 -0.293945,2.1835937 -0.293946,0.9868164 -0.986817,1.9526371 -0.671875,0.96582 -1.280761,1.616699 -0.608887,0.650879 -1.742676,1.763672 l -4.3461916,4.178222 q -0.2939453,0.293946 -0.9448242,1.091797 -0.6508789,0.797852 -1.4487305,2.20459 -0.7978515,1.406738 -0.7978515,2.330566 h 8.1044918 q 1.112793,0 1.763672,-1.049804 0.650879,-1.070801 1.23877,-3.506348 0.440918,-0.08398 0.818847,0.230957 -0.04199,1.070801 -0.335937,3.128418 -0.293945,2.057617 -0.692871,3.65332 -1.973633,-0.08398 -3.359375,-0.08398 H 3.1704102 l -3.12841801,0.08398 q 0,-2.078613 0.94482422,-3.968261 Q 1.9526367,20.429199 4.934082,17.405762 l 3.1914063,-3.128418 q 1.784668,-1.82666 2.4355467,-3.569336 0.650879,-1.7636721 0.650879,-4.0102541 0,-1.4697266 -0.419922,-2.6035156 Q 10.37207,2.9394531 9.7001953,2.3305664 9.0493164,1.7006836 8.3564453,1.3857422 7.6845703,1.0708008 7.0546875,1.0708008 q -1.112793,0 -1.9526367,0.3149414 Q 4.262207,1.7006836 3.8212891,2.2045898 3.4013672,2.6875 3.1914063,3.1914063 3.0024414,3.6743164 3.0024414,4.1152344 q 0,0.1889648 0.1679688,0.5878906 0.1679687,0.3779297 0.1889648,0.440918 0.1679688,0.5878906 0.1679688,0.8608398 0,0.5878906 -0.6088868,1.0288086 -0.6088867,0.440918 -1.1967773,0.440918 -0.7138672,0 -1.21777345,-0.3569336 Q 0,6.7607422 0,6.1098633 Z" },
    "3" : { w: 15.873047, h: 26.707035, d: "m 7.3696289,1.0708008 q -0.3569336,0 -0.8608398,0.1259765 Q 6.0258789,1.3017578 5.4379883,1.5957031 4.8710937,1.8686523 4.3881836,2.2675781 3.9262695,2.6665039 3.590332,3.3383789 3.2753906,3.9892578 3.2753906,4.7661133 q 0,0.7768554 -0.4199218,1.5117187 -0.4199219,0.7348633 -1.2597657,0.7348633 -0.71386716,0 -1.09179685,-0.4619141 -0.37792969,-0.461914 -0.37792969,-1.0078125 0,-0.4829101 0.23095703,-1.1127929 Q 0.58789062,3.7792969 1.1757812,2.9814453 1.784668,2.1835938 2.6665039,1.5327148 3.5483398,0.88183594 5.0180664,0.44091797 6.487793,0 8.2724609,0 q 1.553711,0 2.7714841,0.46191406 1.217774,0.44091797 1.889649,1.15478514 0.671875,0.6928711 1.007812,1.4487305 0.335938,0.7558594 0.335938,1.4907226 0,0.6928711 -0.125977,1.2387696 -0.10498,0.5249023 -0.48291,1.3227539 -0.37793,0.7978515 -1.322754,1.6796875 -0.923828,0.8608398 -2.3725585,1.7846677 l 0.041992,0.08399 q 1.049804,0.167968 1.994629,0.608886 0.96582,0.440918 1.868652,1.217774 0.902832,0.755859 1.44873,2.078613 0.545899,1.301758 0.545899,2.960449 0,2.750489 -1.364746,4.871094 -1.34375,2.120605 -3.54834,3.212402 -2.1835948,1.091797 -4.7661143,1.091797 -1.322754,0 -2.7504883,-0.356933 Q 2.0366211,25.993164 1.0078125,25.321289 0,24.628418 0,23.80957 q 0,-0.524902 0.56689453,-1.007812 0.56689457,-0.48291 1.23876957,-0.48291 1.0708007,0 1.8476562,1.112793 l 0.2939453,0.524902 q 0.2309571,0.398926 0.3989258,0.608887 0.1889648,0.188965 0.5039063,0.48291 0.3359375,0.293945 0.7978515,0.440918 0.4829102,0.125976 1.112793,0.125976 0.5039062,0 1.1547851,-0.209961 0.671875,-0.230957 1.4487305,-0.776855 0.7978512,-0.566895 1.4487302,-1.364746 0.650879,-0.818848 1.091797,-2.162598 0.440918,-1.34375 0.440918,-2.960449 0,-5.626953 -5.6689452,-5.626953 -1.112793,0 -1.8476562,0.08398 l -0.2309571,-0.94482 q 1.8266602,-0.293945 3.4013672,-1.44873 1.5747071,-1.1757817 2.3935543,-2.5405278 0.839844,-1.3647461 0.839844,-2.456543 0,-1.8896484 -1.175781,-3.0024414 -1.1547852,-1.133789 -2.6875001,-1.133789 z" },
    "4" : { w: 17.636719, h: 26.434088, d: "M 10.519043,17.237793 Q 10.561035,6.4667969 10.456055,4.1152344 5.3120117,11.148926 1.5117187,17.237793 Z m 6.466797,0 q 0.650879,0 0.650879,0.692871 0,0.37793 -0.37793,0.650879 -0.37793,0.251953 -0.86084,0.251953 h -3.023437 q 0,3.17041 0.04199,4.388184 0.021,0.440918 0.08398,0.755859 0.08398,0.314941 0.167969,0.545898 0.08398,0.209961 0.314941,0.37793 0.251954,0.146973 0.398926,0.230957 0.146973,0.08398 0.566895,0.146973 0.419922,0.06299 0.650879,0.10498 0.230957,0.021 0.839843,0.06299 0.188965,0.188964 0.188965,0.503906 0,0.293945 -0.188965,0.48291 -0.48291,-0.021 -1.952636,-0.125977 -1.469727,-0.08398 -2.435547,-0.08398 -1.154785,0 -2.9604494,0.104981 -1.8056641,0.10498 -2.1206055,0.10498 -0.1889648,-0.188965 -0.1889648,-0.48291 0,-0.314942 0.1889648,-0.503906 0.5878906,-0.04199 0.9028321,-0.06299 0.3149414,-0.04199 0.7768554,-0.125976 0.4829102,-0.08398 0.7348633,-0.230957 0.2519531,-0.146973 0.5249024,-0.37793 0.2729487,-0.230957 0.3989257,-0.587891 0.125977,-0.356933 0.146973,-0.839843 0.04199,-1.217774 0.04199,-4.388184 H 1.6796875 Q 0.35693359,18.833496 0,17.027832 2.8764648,12.513672 6.2148437,7.7685547 9.5742188,3.0234375 11.652832,0.46191406 12.072754,0 12.345703,0 h 1.070801 l 0.08398,0.08398437 q -0.021,0.14697266 -0.04199,0.71386719 0,0.54589844 0,1.53271484 0,0.9658203 -0.04199,1.9106445 -0.104981,2.3515625 -0.06299,12.9965821 z" },
    "5" : { w: 15.222168, h: 26.749023, d: "m 11.652832,18.140625 q 0,-3.338379 -1.511719,-5.144043 -1.5117185,-1.82666 -3.7373044,-1.82666 -2.7294922,0 -5.45898438,1.028808 L 2.3935547,0.25195313 Q 4.9130859,0.46191406 7.0336914,0.46191406 9.5952148,0.46191406 14.088379,0 L 14.40332,0.16796875 13.710449,2.6665039 Q 11.064941,2.918457 9.1962891,2.918457 q -1.8686524,0 -5.4589844,-0.3779297 L 2.8764648,10.141113 q 0.671875,-0.2519528 2.015625,-0.4619138 1.34375,-0.230957 2.6245118,-0.230957 2.3305664,0 4.1152344,1.1127928 1.784668,1.112793 2.6875,2.897461 0.902832,1.784668 0.902832,3.905274 0,4.073242 -2.58252,6.739746 -2.561523,2.645507 -6.5507808,2.645507 -1.2387695,0 -2.6455078,-0.440918 Q 2.0366211,25.888184 1.0078125,25.132324 0,24.355469 0,23.515625 q 0,-0.608887 0.48291016,-0.96582 0.48291015,-0.37793 1.13378904,-0.37793 1.1337891,0 2.2045899,1.385742 0.083984,0.104981 0.3569336,0.524903 0.2939453,0.419921 0.461914,0.608886 0.1679688,0.167969 0.4829102,0.461914 0.3149414,0.27295 0.6928711,0.398926 0.3779297,0.104981 0.8398437,0.104981 1.9526367,0 3.4643553,-2.225586 1.532715,-2.246582 1.532715,-5.291016 z" },
    "6" : { w: 16.523926, h: 26.749023, d: "m 3.6953125,12.912598 q -0.3779297,1.763672 -0.3779297,3.506347 0,2.120606 0.3359375,3.779297 0.3569336,1.637695 0.902832,2.666504 0.5458985,1.007813 1.3227539,1.658691 0.7768555,0.629883 1.553711,0.881836 0.7768555,0.251954 1.6376953,0.251954 1.6796875,0 2.8974605,-1.952637 1.23877,-1.952637 1.23877,-5.312012 0,-0.713867 -0.146973,-1.553711 -0.125976,-0.839844 -0.503906,-1.82666 -0.37793,-0.986816 -0.944824,-1.763672 -0.566895,-0.776855 -1.532715,-1.301758 -0.9658203,-0.524902 -2.1625977,-0.524902 -2.4985351,0 -4.2202148,1.490723 z m 0.3149414,-1.217774 q 0.9238281,-0.608886 2.3305664,-0.96582 1.4067383,-0.37793 2.4775391,-0.37793 1.7006836,0 3.0444336,0.398926 1.34375,0.398926 2.20459,1.070801 0.86084,0.671875 1.427734,1.616699 0.566895,0.944824 0.797852,1.973633 0.230957,1.007812 0.230957,2.162597 0,1.154786 -0.272949,2.372559 -0.27295,1.217773 -0.902832,2.456543 -0.629883,1.217773 -1.532715,2.183594 -0.881836,0.96582 -2.246582,1.574707 -1.34375,0.58789 -2.9604496,0.58789 -1.1127929,0 -2.1835937,-0.251953 Q 5.3540039,26.266113 4.1572266,25.573242 2.9604492,24.859375 2.0576172,23.767578 1.1757812,22.654785 0.58789062,20.723145 0,18.791504 0,16.292969 0,13.668457 1.0288086,10.896973 2.0576172,8.1464844 4.0102539,5.8789062 5.8999023,3.7163086 8.0625,2.3305664 10.246094,0.94482422 13.416504,0 q 0.10498,0.06298828 0.146973,0.14697266 0.06299,0.0629883 0.08398,0.18896484 0.021,0.12597656 0.021,0.20996094 0.021,0.0839844 0,0.29394531 0,0.18896485 0,0.27294925 Q 11.568848,1.8896484 9.8681641,3.1074219 8.1884766,4.3251953 7.0546875,5.7739258 5.9418945,7.2016602 5.2070312,8.6503906 4.472168,10.099121 4.0102539,11.694824 Z" },
    "7" : { w: 16.041016, h: 26.958984, d: "m 4.703125,2.9604492 q -1.1967773,0 -2.1416016,0.9028321 Q 1.6166992,4.7451172 0.96582031,7.1176758 0.62988281,7.159668 0,6.9916992 L 0.25195313,5.3540039 0.54589844,3.4223633 Q 0.65087891,2.7924805 0.73486328,1.8266602 0.83984375,0.83984375 0.86083984,0.12597656 0.86083984,0 1.0498047,0 1.2177734,0.04199219 1.7636719,0.31494141 2.3305664,0.58789062 3.1914063,0.58789062 h 8.8603517 q 1.700683,0 3.317383,-0.46191406 l 0.671875,0.50390625 Q 10.225098,14.844238 6.1938477,26.812012 L 3.6113281,26.958984 3.2753906,26.644043 Q 8.9233398,14.025391 13.374512,2.9604492 Z" },
    "8" : { w: 15.957031, h: 26.707031, d: "m 8.0834961,1.0708008 q -1.8476563,0 -3.0444336,1.2387695 -1.1967773,1.2177735 -1.1967773,2.7924805 0,1.1757812 0.6298828,2.2885742 0.6508789,1.0917969 2.4985351,2.2885742 l 1.34375,0.7978518 Q 8.9443359,10.015137 9.1962891,9.8261719 9.4482422,9.6162109 10.141113,8.9863281 10.85498,8.3564453 11.211914,7.8945312 11.568848,7.4116211 11.883789,6.71875 q 0.335938,-0.7138672 0.335938,-1.3857422 0,-1.6586914 -1.091797,-2.9604492 Q 10.036133,1.0708008 8.0834961,1.0708008 Z M 14.88623,5.375 q 0,0.7768555 -0.377929,1.5957031 -0.356934,0.7978516 -0.818848,1.3857422 -0.461914,0.5668945 -1.259765,1.2597656 -0.797852,0.6928711 -1.259766,1.0288091 l -1.2807618,0.881835 2.6245118,1.72168 q 3.443359,2.267578 3.443359,6.004883 0,1.280762 -0.524902,2.561523 -0.524902,1.280762 -1.511719,2.393555 -0.96582,1.112793 -2.603515,1.805664 -1.6376958,0.692871 -3.6533208,0.692871 -3.4853515,0 -5.5849609,-1.763672 Q 0,23.179687 0,19.946289 0,16.98584 2.4985352,14.78125 3.1494141,14.193359 5.7739258,12.19873 L 4.9970703,11.736816 Q 2.9814453,10.477051 1.9946289,9.0913086 1.0288086,7.6845703 1.0288086,5.9208984 q 0,-2.5405273 2.015625,-4.2202148 Q 5.0810547,0 8.3144531,0 11.400879,0 13.143555,1.5117187 14.88623,3.0024414 14.88623,5.375 Z M 7.7475586,25.615234 q 0.6298828,0 1.3017578,-0.146972 0.6928711,-0.167969 1.4277346,-0.545899 0.755859,-0.398926 1.34375,-0.986816 0.58789,-0.608887 0.96582,-1.595703 0.37793,-0.986817 0.37793,-2.225586 0,-3.338379 -3.8632815,-5.710938 L 7.2646484,13.185547 q -1.3017578,0.86084 -2.2675781,1.889648 -0.9658203,1.028809 -1.4487305,1.952637 -0.4829101,0.923828 -0.7138671,1.658691 -0.209961,0.713868 -0.209961,1.259766 0,1.364746 0.5249024,2.498535 0.5249023,1.133789 1.3227539,1.805664 0.7978515,0.650879 1.6586914,1.007813 0.8608398,0.356933 1.6166992,0.356933 z" },
    "9" : { w: 16.50293 , h: 26.749023, d: "m 12.828613,13.81543 q 0.37793,-1.763672 0.37793,-3.506348 0,-2.1206054 -0.356934,-3.7583008 Q 12.513672,4.8920898 11.946777,3.8842773 11.400879,2.8554688 10.624023,2.2255859 9.847168,1.574707 9.0703125,1.3227539 8.293457,1.0708008 7.4326172,1.0708008 q -1.6796875,0 -2.897461,1.9526367 -1.2177734,1.9316406 -1.2177734,5.3120117 0,0.7138672 0.1259766,1.553711 0.1469726,0.8398438 0.5249023,1.8266598 0.3779297,0.986817 0.9448242,1.763672 0.5668946,0.776856 1.5327149,1.301758 0.9658203,0.524902 2.1625976,0.524902 2.4985356,0 4.2202146,-1.490722 z m -0.314941,1.238769 q -0.923828,0.587891 -2.330567,0.965821 -1.3857417,0.356933 -2.4775386,0.356933 -1.7006836,0 -3.0444336,-0.398926 -1.34375,-0.398925 -2.2045898,-1.0708 Q 1.5957031,14.235352 1.0288086,13.290527 0.46191406,12.345703 0.23095703,11.337891 0,10.309082 0,9.1542969 0,7.9995117 0.27294922,6.7817383 0.54589844,5.5639648 1.1757812,4.3461914 1.8056641,3.1074219 2.6875,2.1625977 3.590332,1.1967773 4.934082,0.60888672 6.2988281,0 7.9155273,0 q 1.112793,0 2.1625977,0.23095703 1.070801,0.23095703 2.267578,0.94482417 1.217774,0.6928711 2.09961,1.8056641 0.881835,1.0917969 1.469726,3.0234375 0.587891,1.9316406 0.587891,4.4301762 0,2.645507 -1.007813,5.416992 -1.028808,2.729492 -2.981445,4.99707 -1.889649,2.162598 -4.0522462,3.569336 -2.1835938,1.406738 -5.3540039,2.330566 -0.083984,-0.04199 -0.1469727,-0.125976 -0.041992,-0.08398 -0.083984,-0.146973 -0.020996,-0.06299 -0.041992,-0.188965 0,-0.125976 0,-0.188964 v -0.251954 -0.230957 q 2.0996093,-0.776855 3.7792968,-1.973632 1.7006836,-1.217774 2.8344727,-2.666504 1.1337893,-1.448731 1.8686533,-2.897461 0.734863,-1.448731 1.196776,-3.023438 z" },
    "10": { w: 34.181641, h: 26.644043, d: "m 8.3144531,21.541992 q 0.041992,0.923828 0.1049805,1.532715 0.062988,0.587891 0.2519531,1.049805 0.209961,0.440918 0.4199219,0.671875 0.2099609,0.230957 0.6928711,0.377929 0.4829103,0.146973 0.9448243,0.188965 0.461914,0.04199 1.322754,0.08398 0.188965,0.188964 0.188965,0.503906 0,0.293945 -0.188965,0.48291 -0.96582,-0.021 -2.5195314,-0.125977 -1.5327149,-0.08398 -2.6035157,-0.08398 -1.1547851,0 -2.8344726,0.08398 -1.6796875,0.104981 -2.5825196,0.125977 -0.1889648,-0.188965 -0.1889648,-0.48291 0,-0.314942 0.1889648,-0.503906 0.8608399,-0.04199 1.322754,-0.08398 0.461914,-0.04199 0.9448242,-0.188965 0.4829101,-0.146972 0.6928711,-0.377929 0.2099609,-0.230957 0.3989257,-0.671875 0.209961,-0.461914 0.2729493,-1.049805 0.062988,-0.608887 0.1049804,-1.532715 0.062988,-1.910644 0.062988,-7.327637 0,-5.6269527 -0.062988,-7.5585933 Q 5.2070312,5.375 5.0390625,4.7661133 4.8710937,4.1572266 4.3881836,4.1572266 q -1.1337891,0 -3.73730469,1.0917968 Q 0.06298828,4.8710937 0,4.3041992 5.5429687,1.7216797 8.3144531,0 8.5664063,0 8.5664063,0.20996094 8.4824219,1.0288086 8.3144531,5.9628906 q -0.062988,1.9106446 -0.062988,7.7895504 0,5.878907 0.062988,7.789551 z M 26.01416,1.0708008 q -0.629883,0 -1.238769,0.3149414 -0.608887,0.3149414 -1.280762,1.2177734 -0.671875,0.9028321 -1.175781,2.2885742 -0.482911,1.3857422 -0.797852,3.7583008 -0.314941,2.3515624 -0.314941,5.3959964 0,1.238769 0.125976,2.645508 0.125977,1.406738 0.461914,3.023437 0.356934,1.616699 0.86084,2.897461 0.503906,1.259766 1.34375,2.120605 0.839844,0.839844 1.889649,0.839844 0.293945,0 0.629882,-0.06299 0.335938,-0.06299 0.86084,-0.293945 0.524903,-0.251954 0.965821,-0.629883 0.461914,-0.398926 0.902832,-1.154785 0.461914,-0.75586 0.734863,-1.763672 0.713867,-2.666504 0.713867,-9.280274 0,-4.0312497 -0.818848,-6.8447263 Q 29.058594,2.7294922 27.945801,1.8056641 27.147949,1.0708008 26.01416,1.0708008 Z M 25.846191,26.644043 q -2.351562,0 -4.241211,-1.805664 -1.868652,-1.82666 -2.876464,-4.787109 -1.007813,-2.981446 -1.007813,-6.466797 0,-2.498535 0.440918,-4.6821292 Q 18.623535,6.71875 19.400391,5.1230469 20.198242,3.5063477 21.248047,2.3515625 22.297852,1.1757812 23.515625,0.58789062 24.733398,0 26.01416,0 q 1.82666,0 2.981445,0.69287109 1.154786,0.69287111 2.267579,2.14160161 2.918457,3.8632812 2.918457,10.3510743 0,2.897461 -0.566895,5.270019 -0.545898,2.351563 -1.406738,3.842286 -0.86084,1.490722 -1.994629,2.498535 -1.133789,1.007812 -2.225586,1.427734 -1.091797,0.419922 -2.141602,0.419922 z" },
    "11": { w: 32.229004, h: 26.434076, d: "m 8.3144531,21.541992 q 0.041992,0.923828 0.1049805,1.532715 0.062988,0.587891 0.2519531,1.049805 0.209961,0.440918 0.4199219,0.671875 0.2099609,0.230957 0.6928711,0.377929 0.4829103,0.146973 0.9448243,0.188965 0.461914,0.04199 1.322754,0.08398 0.188965,0.188964 0.188965,0.503906 0,0.293945 -0.188965,0.48291 -0.96582,-0.021 -2.5195314,-0.125977 -1.5327149,-0.08398 -2.6035157,-0.08398 -1.1547851,0 -2.8344726,0.08398 -1.6796875,0.104981 -2.5825196,0.125977 -0.1889648,-0.188965 -0.1889648,-0.48291 0,-0.314942 0.1889648,-0.503906 0.8608399,-0.04199 1.322754,-0.08398 0.461914,-0.04199 0.9448242,-0.188965 0.4829101,-0.146972 0.6928711,-0.377929 0.2099609,-0.230957 0.3989257,-0.671875 0.209961,-0.461914 0.2729493,-1.049805 0.062988,-0.608887 0.1049804,-1.532715 0.062988,-1.910644 0.062988,-7.327637 0,-5.6269527 -0.062988,-7.5585933 Q 5.2070312,5.375 5.0390625,4.7661133 4.8710937,4.1572266 4.3881836,4.1572266 q -1.1337891,0 -3.73730469,1.0917968 Q 0.06298828,4.8710937 0,4.3041992 5.5429687,1.7216797 8.3144531,0 8.5664063,0 8.5664063,0.20996094 8.4824219,1.0288086 8.3144531,5.9628906 q -0.062988,1.9106446 -0.062988,7.7895504 0,5.878907 0.062988,7.789551 z m 19.9882809,0 q 0.04199,0.923828 0.104981,1.532715 0.06299,0.587891 0.251953,1.049805 0.209961,0.440918 0.419922,0.671875 0.209961,0.230957 0.692871,0.377929 0.48291,0.146973 0.944824,0.188965 0.461914,0.04199 1.322754,0.08398 0.188965,0.188964 0.188965,0.503906 0,0.293945 -0.188965,0.48291 -0.96582,-0.021 -2.519531,-0.125977 -1.532715,-0.08398 -2.603516,-0.08398 -1.154785,0 -2.834472,0.08398 -1.679688,0.104981 -2.58252,0.125977 -0.188965,-0.188965 -0.188965,-0.48291 0,-0.314942 0.188965,-0.503906 0.86084,-0.04199 1.322754,-0.08398 0.461914,-0.04199 0.944824,-0.188965 0.48291,-0.146972 0.692871,-0.377929 0.209961,-0.230957 0.398926,-0.671875 0.209961,-0.461914 0.272949,-1.049805 0.06299,-0.608887 0.104981,-1.532715 0.06299,-1.910644 0.06299,-7.327637 0,-5.6269527 -0.06299,-7.5585933 Q 25.195312,5.375 25.027344,4.7661133 24.859375,4.1572266 24.376465,4.1572266 q -1.133789,0 -3.737305,1.0917968 Q 20.05127,4.8710937 19.988281,4.3041992 25.53125,1.7216797 28.302734,0 q 0.251953,0 0.251953,0.20996094 -0.08398,0.81884766 -0.251953,5.75292966 -0.06299,1.9106446 -0.06299,7.7895504 0,5.878907 0.06299,7.789551 z" }
}

const SVG_PATHS_NOTES = {
    "0" : { w: 24.754395, h: 28.722656, d: "m 13.836426,28.722656 q -2.6875,0 -4.9760744,-0.776855 Q 6.5717773,27.147949 4.9550781,25.804199 3.359375,24.460449 2.2255859,22.675781 1.0917969,20.870117 0.54589844,18.875488 0,16.859863 0,14.760254 0,11.421875 1.1967773,8.5454102 2.3935547,5.6479492 4.5561523,3.6533203 8.5454102,0 13.878418,0 q 2.30957,0 4.157227,0.44091797 1.847656,0.44091797 3.17041,0.94482423 1.322754,0.4829101 2.099609,0.5668945 0.776856,4.8710938 0.944824,6.6557617 -0.398926,0.2729493 -0.986816,0.209961 -2.30957,-7.6425782 -9.595215,-7.6425782 -1.784668,0 -3.8002929,1.0288086 -2.015625,1.0078125 -3.5483399,2.8764649 -1.1967773,1.4697265 -1.8686523,3.800293 -0.671875,2.3095703 -0.671875,5.0600583 0,1.910645 0.3989258,3.821289 0.3989257,1.889649 1.2177734,3.632325 0.8188476,1.742675 1.9736328,3.086425 1.1757813,1.322754 2.8344731,2.120606 1.658691,0.797851 3.590332,0.797851 2.897461,0 5.249023,-1.238769 2.351563,-1.259766 4.724121,-3.884278 0.629883,0 0.986817,0.650879 -2.183594,2.855469 -4.976075,4.325196 -2.79248,1.469726 -5.941894,1.469726 z" },
    "1" : { w: 28.698744, h: 40.054745, d: "m 4.9267335,36.874894 q 0.013647,0.600488 0.068237,0.941675 0.05459,0.327539 0.2320068,0.682373 0.1910645,0.341186 0.532251,0.518603 0.354834,0.16377 0.9416748,0.272949 0.6004883,0.09553 1.5012208,0.09553 1.241919,0 2.3064211,-0.21836 1.064502,-0.232007 2.047119,-0.764258 0.982618,-0.545898 1.678638,-1.364746 0.696021,-0.832495 1.105444,-2.115356 0.409424,-1.296509 0.409424,-2.947852 0,-1.351098 -0.272949,-2.647607 -0.272949,-1.310157 -0.900732,-2.565723 -0.627784,-1.269214 -1.555811,-2.210889 -0.928027,-0.955322 -2.347363,-1.542163 -1.4193366,-0.586841 -3.1662116,-0.586841 -0.6277833,0 -1.064502,0.06824 -0.4230713,0.05459 -0.709668,0.191064 -0.2729492,0.136475 -0.4367188,0.313892 -0.1501221,0.177417 -0.2320068,0.477661 -0.068237,0.286596 -0.095532,0.586841 -0.027295,0.300244 -0.040942,0.75061 v 0.122827 q -0.1091797,4.694727 -0.1091797,6.045826 0,2.838671 0.1091797,5.895703 z M 3.6984619,21.889981 q 0.4230713,0 2.1153566,-0.06824 1.6922852,-0.06824 2.7431397,-0.06824 1.9788818,0 3.7666988,0.764258 1.801465,0.764257 3.097974,2.060766 1.296509,1.282862 2.060767,3.057032 0.777905,1.760522 0.777905,3.671167 0,1.978881 -0.586841,3.54834 -0.586841,1.55581 -1.514868,2.511132 -0.91438,0.955323 -2.169946,1.583106 -1.241919,0.627783 -2.456543,0.873437 -1.200977,0.232007 -2.4701908,0.232007 -1.6786377,0 -3.3572754,-0.06824 -1.6786378,-0.06824 -1.951587,-0.06824 -0.7779053,0 -1.9242921,0.05459 -1.13273924,0.06824 -1.70593261,0.08188 Q -6.6123903e-8,39.931925 -6.6123903e-8,39.740861 q 0,-0.204712 0.122827156123903,-0.327539 0.40942383,-0.01365 0.65507814,-0.0273 0.25930177,-0.02729 0.53225097,-0.06824 0.2729492,-0.05459 0.4094239,-0.122827 0.150122,-0.08188 0.3002441,-0.204712 0.1637695,-0.136474 0.2320069,-0.300244 0.081885,-0.177417 0.150122,-0.450366 0.068237,-0.272949 0.081885,-0.586841 0.027295,-0.327539 0.040942,-0.777905 0.1091797,-4.640137 0.1091797,-5.922998 0,-1.378394 -0.1091797,-6.018531 Q 2.5111328,24.482999 2.4838379,24.169107 2.4701904,23.841568 2.4019531,23.568619 2.3337158,23.29567 2.2518311,23.1319 2.1835937,22.954483 2.0198242,22.831656 1.8697021,22.695182 1.7195801,22.626944 1.5831054,22.545059 1.3101562,22.504117 1.037207,22.449527 0.77790523,22.43588 0.53225092,22.408585 0.12282709,22.394937 -6.6123903e-8,22.27211 -6.6123903e-8,22.081046 q 0,-0.204712 0.122827156123903,-0.327539 0.60048829,0.01365 1.70593261,0.08188 1.1190919,0.05459 1.8697022,0.05459 z M 22.787525,33.967985 v 3.49375 q 1.951587,-0.750611 2.879615,-1.664991 0.941674,-0.928027 0.941674,-2.306421 0,-0.573193 -0.341186,-1.023559 -0.327539,-0.464014 -0.832495,-0.464014 -1.378394,0 -2.647608,1.965235 z m 0,-9.307569 v 8.270361 h 0.0273 q 0.764258,-1.269213 1.392041,-1.787817 0.641431,-0.532251 1.705933,-0.532251 1.173682,0 1.924292,0.723316 0.764258,0.723315 0.764258,1.815112 0,1.091797 -0.436719,1.951587 -0.423071,0.846142 -1.296509,1.487573 -0.85979,0.627783 -1.965234,1.091797 -1.091797,0.450366 -2.620313,0.846143 L 21.804908,38.403409 V 24.660416 q 0.06824,-0.06824 0.491309,-0.06824 0.423071,-0.01365 0.491308,0.06824 z M 11.725037,18.669727 q -1.7468752,0 -3.2344485,-0.504956 Q 7.0030152,17.646167 5.9521607,16.77273 4.9149537,15.899292 4.1779908,14.739258 3.4410278,13.565576 3.0861939,12.269068 2.7313599,10.958911 2.7313599,9.5941651 q 0,-2.1699464 0.7779053,-4.0396486 Q 4.2871704,3.6711669 5.692859,2.3746581 8.2858766,-2.1606684e-7 11.752332,-2.1606684e-7 q 1.501221,0 2.702197,0.28659668606684 1.200977,0.28659669 2.060767,0.61413576 0.85979,0.31389157 1.364746,0.36848147 0.504956,3.166211 0.614136,4.3262452 -0.259302,0.177417 -0.641431,0.1364746 -1.501221,-4.96767588 -6.23689,-4.96767588 -1.160034,0 -2.4701903,0.66872558 -1.3101563,0.6550782 -2.306421,1.8697022 -0.7779053,0.9553223 -1.214624,2.4701905 -0.4367188,1.5012208 -0.4367188,3.2890382 0,1.2419189 0.2593018,2.4838379 0.2593017,1.228272 0.7915527,2.361011 0.532251,1.132739 1.2828614,2.006177 0.7642578,0.85979 1.8424073,1.378393 1.0781489,0.518604 2.3337159,0.518604 1.88335,0 3.411865,-0.8052 1.528516,-0.818848 3.070679,-2.524781 0.409424,0 0.641431,0.423072 -1.419336,1.856054 -3.234449,2.811377 -1.815112,0.955322 -3.862231,0.955322 z M 26.187611,1.6240477 h 0.96897 v 3.9168214 l 1.542163,-0.6141358 v 1.7332276 l -1.542163,0.6141358 v 2.8113773 l 1.542163,-0.6277835 v 1.7332275 l -1.542163,0.614136 v 3.684814 h -0.96897 V 12.20083 l -3.057031,1.228272 v 4.35354 h -0.96897 v -3.957764 l -1.514868,0.600488 V 12.746729 L 22.16161,12.132593 V 9.2939209 L 20.646742,9.8944092 V 8.1611816 L 22.16161,7.5606933 V 3.9168212 h 0.96897 V 7.164917 l 3.057031,-1.2282715 z m 0,8.8572023 V 7.669873 L 23.13058,8.8981446 v 2.8386724 z" },
    "2" : { w: 28.092773, h: 28.155762, d: "m 7.5795898,23.263672 q 0.020996,0.923828 0.1049805,1.44873 0.083984,0.503907 0.3569336,1.049805 0.2939453,0.524902 0.8188477,0.797852 0.5458984,0.251953 1.4487304,0.419921 0.923828,0.146973 2.30957,0.146973 1.910645,0 3.54834,-0.335937 1.637695,-0.356934 3.149414,-1.175782 1.511719,-0.839843 2.58252,-2.099609 1.070801,-1.280762 1.700683,-3.254395 0.629883,-1.994628 0.629883,-4.535156 0,-2.078613 -0.419922,-4.073242 Q 23.389648,9.637207 22.423828,7.7055664 21.458008,5.7529297 20.030273,4.3041992 18.602539,2.8344727 16.418945,1.9316406 q -2.183593,-0.902832 -4.871093,-0.902832 -0.965821,0 -1.6376957,0.1049805 Q 9.2592773,1.2177734 8.8183594,1.4277344 8.3984375,1.6376953 8.1464844,1.9106445 7.9155273,2.1835938 7.7895508,2.6455078 7.6845703,3.0864258 7.6425781,3.5483398 7.6005859,4.0102539 7.5795898,4.703125 v 0.1889648 q -0.1679687,7.2226562 -0.1679687,9.3012692 0,4.367188 0.1679687,9.070313 z M 5.6899414,0.20996094 q 0.6508789,0 3.2543945,-0.10498047 Q 11.547852,0 13.164551,0 q 3.044433,0 5.794922,1.1757812 2.771484,1.1757813 4.766113,3.1704102 1.994629,1.9736328 3.17041,4.703125 1.196777,2.7084966 1.196777,5.6479496 0,3.044433 -0.902832,5.458984 -0.902832,2.393555 -2.330566,3.863281 -1.406738,1.469727 -3.338379,2.435547 -1.910644,0.96582 -3.779297,1.34375 -1.847656,0.356934 -3.800293,0.356934 -2.582519,0 -5.1650388,-0.104981 -2.5825195,-0.10498 -3.0024414,-0.10498 -1.1967774,0 -2.9604492,0.08398 Q 1.0708008,28.134766 0.18896484,28.155762 0,27.966797 0,27.672852 0,27.35791 0.18896484,27.168945 q 0.62988282,-0.021 1.00781246,-0.04199 0.3989258,-0.04199 0.8188477,-0.10498 0.4199219,-0.08398 0.6298828,-0.188965 0.230957,-0.125977 0.4619141,-0.314942 0.2519531,-0.209961 0.3569336,-0.461914 0.1259765,-0.272949 0.230957,-0.692871 0.1049805,-0.419922 0.1259766,-0.902832 0.041992,-0.503906 0.062988,-1.196777 0.1679688,-7.138672 0.1679688,-9.112305 0,-2.120605 -0.1679688,-9.2592772 Q 3.8632813,4.1992187 3.8212891,3.7163086 3.800293,3.2124023 3.6953125,2.7924805 3.590332,2.3725586 3.4643555,2.1206055 3.359375,1.8476562 3.1074219,1.6586914 2.8764648,1.4487305 2.6455078,1.34375 2.4355469,1.2177734 2.015625,1.1547852 1.5957031,1.0708008 1.1967773,1.0498047 0.81884766,1.0078125 0.18896484,0.98681641 0,0.79785156 0,0.50390625 0,0.18896484 0.18896484,0 1.112793,0.02099609 2.8134766,0.12597656 q 1.7216796,0.0839844 2.8764648,0.0839844 z" },
    "3" : { w: 28.150976, h: 39.822746, d: "m 8.6506224,29.709976 q 0.7779053,0 1.1736817,-0.06824 0.4367189,-0.05459 0.7233159,-0.136474 0.286596,-0.09553 0.409423,-0.354834 0.136475,-0.259302 0.177417,-0.518604 0.05459,-0.259302 0.08188,-0.791553 0.122827,-0.122827 0.300244,-0.122827 0.191065,0 0.313892,0.122827 -0.01365,0.272949 -0.06824,1.07815 -0.04094,0.791552 -0.04094,1.323803 0,0.450367 0.04094,1.091797 0.05459,0.641431 0.06824,1.091797 -0.122827,0.122827 -0.313892,0.122827 -0.177417,0 -0.300244,-0.122827 -0.0273,-0.450366 -0.06824,-0.682373 -0.04094,-0.232007 -0.191065,-0.504956 -0.136474,-0.272949 -0.409423,-0.395776 -0.259302,-0.122827 -0.7233159,-0.21836 -0.4367188,-0.08188 -1.1736817,-0.08188 l -3.2753907,-0.02729 q -0.027295,4.899438 0.05459,7.246802 0.013648,0.559546 0.2865967,0.887085 0.2865967,0.313891 0.7506104,0.313891 h 4.3535402 q 2.57937,0 3.698462,-4.026001 0.313891,-0.04094 0.368481,-0.0273 0.05459,0.01365 0.300244,0.16377 -0.395776,2.606665 -1.009912,4.749316 -2.238183,-0.136474 -3.575635,-0.136474 H 4.3926145 q -0.4230713,0 -1.7195802,0.05459 -1.2965088,0.06824 -1.9652344,0.08188 -0.12282715,-0.122827 -0.12282715,-0.313891 0,-0.204712 0.12282715,-0.327539 0.5595459,-0.02729 0.8597901,-0.05459 0.3002441,-0.0273 0.6004883,-0.122827 0.3138916,-0.09553 0.4503662,-0.245655 0.1364746,-0.150122 0.2593017,-0.436718 0.1228272,-0.300245 0.1637696,-0.682374 0.040942,-0.395776 0.068237,-0.996264 0.05459,-2.292774 0.05459,-5.922998 0,-3.725757 -0.05459,-6.018531 Q 3.0824582,24.10087 3.0415158,23.718741 3.0005734,23.322965 2.8777462,23.036368 2.7549191,22.736124 2.6184445,22.586002 2.4819699,22.43588 2.1680783,22.340347 1.8678341,22.244815 1.56759,22.21752 1.2673458,22.190225 0.7077999,22.16293 0.58497275,22.040103 0.58497275,21.849039 q 0,-0.204712 0.12282715,-0.327539 0.6960205,0.01365 1.951587,0.08188 1.2555664,0.05459 1.6786377,0.05459 h 8.1611814 q 0.300245,0 0.518604,-0.02729 0.218359,-0.0273 0.491309,-0.08188 0.286596,-0.06824 0.395776,-0.08188 0.10918,0 0.10918,0.08188 0.04094,0.177417 0.272949,1.760522 0.245654,1.569458 0.341186,2.374658 -0.368481,0.191065 -0.668725,0.136475 -0.532251,-1.66499 -0.873438,-2.224536 -0.791552,-1.160034 -2.265478,-1.187329 H 6.4670286 q -0.4776612,0 -0.7506104,0.354834 -0.2593018,0.341186 -0.2865967,0.873437 -0.040942,1.02356 -0.05459,2.552075 -0.013647,1.514869 -0.013647,2.524781 l 0.013647,1.023559 z m 10.8732916,4.026002 v 3.49375 q 1.951587,-0.750611 2.879614,-1.664991 0.941675,-0.928027 0.941675,-2.306421 0,-0.573193 -0.341187,-1.023559 -0.327539,-0.464014 -0.832495,-0.464014 -1.378393,0 -2.647607,1.965235 z m 0,-9.307569 v 8.270361 h 0.02729 q 0.764258,-1.269213 1.392041,-1.787817 0.641431,-0.532251 1.705933,-0.532251 1.173681,0 1.924292,0.723315 0.764257,0.723316 0.764257,1.815113 0,1.091797 -0.436718,1.951587 -0.423072,0.846142 -1.296509,1.487573 -0.85979,0.627783 -1.965235,1.091797 -1.091797,0.450366 -2.620312,0.846143 L 18.541297,38.171402 V 24.428409 q 0.06824,-0.06824 0.491308,-0.06824 0.423072,-0.01365 0.491309,0.06824 z M 4.9267331,15.121387 q 0.013648,0.600488 0.068237,0.941675 0.05459,0.327539 0.2320069,0.682373 0.1910644,0.341186 0.5322509,0.518603 0.354834,0.16377 0.9416749,0.272949 0.6004883,0.09553 1.5012207,0.09553 1.241919,0 2.3064215,-0.21836 1.064502,-0.232007 2.047119,-0.764258 0.982617,-0.545898 1.678638,-1.364746 0.69602,-0.832495 1.105444,-2.115356 0.409424,-1.296509 0.409424,-2.947852 0,-1.3510985 -0.272949,-2.6476074 Q 15.203271,6.2641843 14.575488,5.0086179 13.947705,3.739404 13.019678,2.7977292 12.09165,1.8424069 10.672314,1.255566 9.2529783,0.6687252 7.5061033,0.6687252 q -0.6277832,0 -1.064502,0.0682373 Q 6.01853,0.79155236 5.7319333,0.92802697 5.4589841,1.0645016 5.2952146,1.2419186 5.1450925,1.4193356 5.0632077,1.7195797 4.9949704,2.0061764 4.9676755,2.3064206 4.9403806,2.6066647 4.9267331,3.0570309 v 0.1228272 q -0.1091797,4.6947267 -0.1091797,6.0458253 0,2.8386716 0.1091797,5.8957036 z M 3.6984616,0.13647421 q 0.4230713,0 2.1153565,-0.0682373 Q 7.5061033,-4.0046871e-7 8.5569578,-4.0046871e-7 q 1.9788822,0 3.7666992,0.76425783046871 1.801465,0.76425787 3.097974,2.06076667 1.296509,1.2828614 2.060767,3.0570313 0.777905,1.7605225 0.777905,3.6711671 0,1.9788815 -0.586841,3.5483395 -0.586841,1.555811 -1.514868,2.511133 -0.91438,0.955323 -2.169947,1.583106 -1.241919,0.627783 -2.456543,0.873437 -1.200976,0.232007 -2.4701901,0.232007 -1.6786378,0 -3.3572755,-0.06824 -1.6786377,-0.06824 -1.951587,-0.06824 -0.7779053,0 -1.924292,0.05459 -1.1327393,0.06824 -1.70593267,0.08188 Q -4.2468309e-7,18.178418 -4.2468309e-7,17.987354 q 0,-0.204712 0.12282715468309,-0.327539 0.40942384,-0.01365 0.65507814,-0.02729 0.25930173,-0.02729 0.53225103,-0.06824 0.2729492,-0.05459 0.4094238,-0.122827 0.1501221,-0.08188 0.3002441,-0.204712 0.1637696,-0.136474 0.2320069,-0.300244 0.081885,-0.177417 0.1501221,-0.450366 0.068237,-0.272949 0.081885,-0.586841 0.027295,-0.327539 0.040942,-0.777905 0.1091797,-4.640137 0.1091797,-5.9229985 0,-1.3783936 -0.1091797,-6.0185304 Q 2.5111325,2.7294919 2.4838375,2.4156003 2.4701901,2.0880612 2.4019528,1.815112 2.3337155,1.5421627 2.2518307,1.3783932 2.1835934,1.2009762 2.0198238,1.078149 1.8697018,0.94167443 1.7195797,0.87343712 1.5831051,0.79155236 1.3101559,0.75060997 1.0372066,0.69602013 0.77790487,0.68237267 0.53225057,0.65507774 0.12282673,0.64143028 -4.2468309e-7,0.51860313 -4.2468309e-7,0.32753867 -4.2468309e-7,0.12282675 0.12282673,-4.0046871e-7 0.72331502,0.01364706 1.8287594,0.08188437 2.9478512,0.13647421 3.6984616,0.13647421 Z M 25.639844,1.3920407 h 0.96897 V 5.308862 l 1.542163,-0.6141357 v 1.7332276 l -1.542163,0.6141357 v 2.8113771 l 1.542163,-0.6277833 v 1.7332276 l -1.542163,0.614136 v 3.684814 h -0.96897 v -3.289038 l -3.057031,1.228272 v 4.35354 h -0.96897 v -3.957764 l -1.514868,0.600488 v -1.678637 l 1.514868,-0.614136 V 9.0619139 L 20.098975,9.6624022 V 7.9291746 L 21.613843,7.3286863 V 3.6848142 h 0.96897 v 3.2480957 l 3.057031,-1.2282715 z m 0,8.8572023 V 7.437866 l -3.057031,1.2282715 v 2.8386715 z" },
    "4" : { w: 22.46582 , h: 28.23975 , d: "m 12.408691,12.681641 q 1.196778,0 1.805664,-0.104981 0.671875,-0.08398 1.112793,-0.209961 0.440918,-0.146972 0.629883,-0.545898 0.209961,-0.398926 0.272949,-0.797852 0.08398,-0.398926 0.125977,-1.2177732 0.188965,-0.1889649 0.461914,-0.1889649 0.293945,0 0.48291,0.1889649 -0.021,0.4199222 -0.10498,1.6586912 -0.06299,1.217774 -0.06299,2.036621 0,0.692871 0.06299,1.679688 0.08398,0.986816 0.10498,1.679687 -0.188965,0.188965 -0.48291,0.188965 -0.272949,0 -0.461914,-0.188965 -0.04199,-0.692871 -0.10498,-1.049804 -0.06299,-0.356934 -0.293946,-0.776856 Q 15.74707,14.613281 15.327148,14.424316 14.928223,14.235352 14.214355,14.088379 13.54248,13.962402 12.408691,13.962402 L 7.3696289,13.92041 q -0.041992,7.537598 0.083984,11.148926 0.020996,0.86084 0.4409179,1.364746 0.440918,0.48291 1.1547852,0.48291 h 6.697754 q 3.968262,0 5.689942,-6.193847 0.48291,-0.06299 0.566894,-0.04199 0.08398,0.021 0.461914,0.251953 -0.608886,4.010254 -1.553711,7.306641 -3.443359,-0.209961 -5.500976,-0.209961 H 5.8579102 q -0.650879,0 -2.6455079,0.08398 Q 1.2177734,28.21875 0.18896484,28.239746 0,28.050781 0,27.756836 0,27.441895 0.18896484,27.25293 1.0498047,27.210937 1.5117187,27.168945 1.9736328,27.126953 2.4355469,26.97998 2.918457,26.833008 3.128418,26.602051 q 0.2099609,-0.230957 0.3989258,-0.671875 0.1889648,-0.461914 0.2519531,-1.049805 0.062988,-0.608887 0.1049804,-1.532715 0.083984,-3.527344 0.083984,-9.112304 0,-5.731934 -0.083984,-9.2592778 Q 3.8422852,4.0522461 3.7792969,3.4643555 3.7163086,2.8554688 3.5273438,2.4145508 3.3383789,1.9526367 3.128418,1.7216797 2.918457,1.4907227 2.4355469,1.34375 1.9736328,1.1967773 1.5117187,1.1547852 1.0498047,1.112793 0.18896484,1.0708008 0,0.88183594 0,0.58789062 0,0.27294922 0.18896484,0.08398437 1.2597656,0.10498047 3.1914063,0.20996094 5.1230469,0.29394531 5.7739258,0.29394531 H 18.32959 q 0.461914,0 0.797851,-0.0419922 0.335938,-0.0419922 0.75586,-0.12597657 Q 20.324219,0.02099609 20.492187,0 q 0.167969,0 0.167969,0.12597656 0.06299,0.27294922 0.419922,2.70849614 0.37793,2.4145507 0.524902,3.6533203 Q 21.038086,6.7817383 20.576172,6.6977539 19.757324,4.1362305 19.232422,3.2753906 18.014648,1.4907227 15.74707,1.4487305 H 9.0493164 q -0.7348633,0 -1.1547852,0.5458984 -0.3989257,0.5249024 -0.4409179,1.34375 -0.062988,1.574707 -0.083984,3.9262695 -0.020996,2.3305664 -0.020996,3.8842776 l 0.020996,1.574707 z" },
    "5" : { w: 20.303223, h: 28.239746, d: "m 7.4536133,23.347656 q 0.020996,1.049805 0.2519531,1.763672 0.230957,0.713867 0.5458984,1.112793 0.3359375,0.398926 1.0078125,0.629883 0.671875,0.209961 1.2597657,0.293945 0.587891,0.06299 1.658691,0.104981 0.188965,0.188965 0.188965,0.503906 0,0.293945 -0.188965,0.48291 -0.776855,-0.021 -2.8554684,-0.125976 -2.0576172,-0.08398 -3.4643554,-0.08398 -1.2177735,0 -3.0024414,0.08398 -1.784668,0.10498 -2.66650396,0.125976 Q 0,28.050781 0,27.756836 0,27.441895 0.18896484,27.25293 1.0498047,27.210937 1.5117187,27.168945 1.9736328,27.126953 2.4355469,26.97998 2.918457,26.833008 3.128418,26.602051 q 0.2099609,-0.230957 0.3989258,-0.671875 0.1889648,-0.461914 0.2519531,-1.049805 0.062988,-0.608887 0.1049804,-1.532715 0.083984,-3.527344 0.083984,-9.112304 0,-5.731934 -0.083984,-9.2592778 Q 3.8422852,4.0522461 3.7792969,3.4643555 3.7163086,2.8554688 3.5273438,2.4145508 3.3383789,1.9526367 3.128418,1.7216797 2.918457,1.4907227 2.4355469,1.34375 1.9736328,1.1967773 1.5117187,1.1547852 1.0498047,1.112793 0.18896484,1.0708008 0,0.88183594 0,0.58789062 0,0.27294922 0.18896484,0.08398437 L 5.7739258,0.29394531 H 17.048828 q 0.461914,0 0.797852,-0.0419922 0.335937,-0.0419922 0.734863,-0.12597657 Q 19.001465,0.04199219 19.19043,0 19.358398,0 19.358398,0.12597656 19.421387,0.39892578 19.77832,2.8344727 20.15625,5.2490234 20.303223,6.487793 19.736328,6.7817383 19.274414,6.6977539 18.455566,4.1782227 17.95166,3.3173828 16.880859,1.5327148 14.718262,1.4487305 H 14.466309 9.0493164 q -0.7348633,0 -1.1547852,0.5458984 -0.3989257,0.5249024 -0.4409179,1.34375 -0.062988,1.574707 -0.083984,4.03125 -0.020996,2.4355469 -0.020996,4.1152341 l 0.020996,1.658692 5.0390617,-0.04199 q 1.196778,0 1.805664,-0.104981 0.671875,-0.08398 1.112793,-0.209961 0.440918,-0.146973 0.629883,-0.545898 0.209961,-0.398926 0.272949,-0.797852 0.08398,-0.398926 0.125977,-1.217773 0.188965,-0.188965 0.461914,-0.188965 0.293945,0 0.48291,0.188965 -0.021,0.419922 -0.10498,1.658691 -0.06299,1.217774 -0.06299,2.036621 0,0.692871 0.06299,1.679688 0.08398,0.986816 0.10498,1.679687 -0.188965,0.188965 -0.48291,0.188965 -0.272949,0 -0.461914,-0.188965 -0.04199,-0.692871 -0.10498,-1.049805 -0.06299,-0.356933 -0.293946,-0.776855 Q 15.74707,15.033203 15.327148,14.865234 14.928223,14.67627 14.214355,14.550293 13.54248,14.40332 12.408691,14.40332 L 7.3696289,14.36133 q -0.041992,5.375 0.083984,8.986328 z" },
    "6" : { w: 28.287447, h: 40.013809, d: "m 9.5532232,21.344083 q 1.1600338,0 2.1426518,0.204712 0.996264,0.191064 1.55581,0.436719 0.559546,0.232007 1.200977,0.436718 0.641431,0.191065 1.187329,0.191065 0.286597,1.392041 0.614136,4.29895 -0.21836,0.16377 -0.668726,0.16377 -1.501221,-4.967676 -6.4279541,-4.967676 -1.3238038,0 -2.5520753,0.655078 -1.2282715,0.641431 -2.1562989,1.760523 -0.9143799,1.105444 -1.4739258,2.702197 -0.5458985,1.583105 -0.5458985,3.370923 0,1.132739 0.3002442,2.320068 0.3138916,1.187329 0.9553223,2.333716 0.6414307,1.146387 1.5285156,2.047119 0.887085,0.887085 2.1426515,1.446631 1.2692139,0.545899 2.702197,0.545899 1.105445,0 2.251831,-0.464014 1.146387,-0.464014 1.88335,-1.160034 v -4.51731 q 0,-0.777905 -0.491309,-1.009912 -0.491308,-0.232007 -1.801464,-0.341187 -0.122828,-0.122827 -0.122828,-0.354834 0,-0.245654 0.122828,-0.368481 0.600488,0.01365 1.733227,0.08188 1.146387,0.05459 1.733228,0.05459 0.627783,0 1.323804,-0.05459 0.69602,-0.06824 0.996264,-0.08188 0.122827,0.122827 0.122827,0.368481 0,0.232007 -0.122827,0.354834 -0.655078,0.06824 -0.96897,0.368482 -0.313891,0.286597 -0.313891,0.982617 v 3.49375 q 0,0.436719 0.436719,0.777905 -1.501221,1.282862 -3.275391,1.93794 -1.77417,0.655078 -4.1488284,0.655078 -2.0607666,0 -3.8349366,-0.709668 Q 3.807642,38.594474 2.593018,37.393498 1.3783939,36.192521 0.68237339,34.582121 3.259629e-7,32.958073 3.259629e-7,31.156608 q 0,-1.801465 0.5322509940371,-3.370923 0.53225098,-1.583106 1.44663088,-2.74314 0.9280274,-1.173682 2.129004,-2.006177 1.214624,-0.846142 2.6066651,-1.269214 1.392041,-0.423071 2.8386719,-0.423071 z M 22.473634,33.790568 v 3.49375 q 1.951587,-0.750611 2.879614,-1.66499 0.941675,-0.928028 0.941675,-2.306421 0,-0.573194 -0.341187,-1.02356 -0.327539,-0.464014 -0.832495,-0.464014 -1.378393,0 -2.647607,1.965235 z m 0,-9.307569 v 8.270362 h 0.02729 q 0.764257,-1.269214 1.392041,-1.787818 0.64143,-0.532251 1.705932,-0.532251 1.173682,0 1.924292,0.723316 0.764258,0.723315 0.764258,1.815112 0,1.091797 -0.436719,1.951587 -0.423071,0.846143 -1.296508,1.487573 -0.859791,0.627784 -1.965235,1.091797 -1.091797,0.450366 -2.620312,0.846143 L 21.491016,38.225993 V 24.482999 q 0.06824,-0.06824 0.491309,-0.06824 0.423071,-0.01365 0.491309,0.06824 z M 8.7021246,15.175977 q 0.013647,0.682373 0.1637695,1.146387 0.1501221,0.464013 0.354834,0.723315 0.2183594,0.259302 0.6550781,0.409424 0.4367188,0.136475 0.8188478,0.191064 0.382129,0.04094 1.078149,0.06824 0.122828,0.122827 0.122828,0.327539 0,0.191064 -0.122828,0.313891 -0.504956,-0.01365 -1.8560544,-0.08188 -1.3374512,-0.05459 -2.2518311,-0.05459 -0.7915527,0 -1.951587,0.05459 -1.1600342,0.06824 -1.7332275,0.08188 -0.1228272,-0.122827 -0.1228272,-0.313891 0,-0.204712 0.1228272,-0.327539 0.5595459,-0.02729 0.85979,-0.05459 0.3002442,-0.02729 0.6004883,-0.122827 0.3138916,-0.09553 0.4503662,-0.245655 0.1364747,-0.150122 0.2593018,-0.436718 0.1228272,-0.300244 0.1637695,-0.682373 0.040942,-0.395777 0.068237,-0.996265 0.05459,-2.292774 0.05459,-5.9229983 0,-3.7257569 -0.05459,-6.0185304 Q 6.3547612,2.63396 6.3138188,2.2518311 6.2728765,1.8560547 6.1500493,1.569458 6.0272222,1.2692139 5.8907475,1.1190918 5.7542729,0.96896973 5.4403813,0.8734375 5.1401372,0.77790527 4.839893,0.75061035 4.5396489,0.72331543 3.980103,0.69602051 3.8572758,0.57319335 3.8572758,0.3821289 q 0,-0.20471192 0.1228272,-0.32753908 l 3.6302247,0.13647462 h 7.3286863 q 0.300245,0 0.518604,-0.0272949 0.218359,-0.0272949 0.477661,-0.08188477 Q 16.208228,0.02729492 16.331055,0 q 0.10918,0 0.10918,0.08188477 0.04094,0.17741699 0.272949,1.76052253 0.245655,1.569458 0.341187,2.3746582 Q 16.685889,4.40813 16.385645,4.3535401 15.853394,2.7158448 15.525855,2.1562989 14.829835,0.99626466 13.424146,0.94167481 H 13.260377 9.7393316 q -0.4776611,0 -0.7506103,0.35483399 -0.2593018,0.3411865 -0.2865967,0.8734375 -0.040942,1.0235596 -0.05459,2.6203126 -0.013647,1.5831055 -0.013647,2.6749024 l 0.013647,1.0781495 3.2753904,-0.027295 q 0.777906,0 1.173682,-0.068237 0.436719,-0.05459 0.723316,-0.1364746 0.286596,-0.095532 0.409423,-0.354834 0.136475,-0.2593017 0.177417,-0.5186035 0.05459,-0.2593018 0.08188,-0.7915528 0.122827,-0.1228271 0.300244,-0.1228271 0.191065,0 0.313892,0.1228271 -0.01365,0.2729493 -0.06824,1.0781495 -0.04094,0.7915527 -0.04094,1.3238037 0,0.4503663 0.04094,1.0917969 0.05459,0.64143 0.06824,1.091797 -0.122827,0.122827 -0.313892,0.122827 -0.177417,0 -0.300244,-0.122827 -0.02729,-0.450367 -0.06824,-0.682373 -0.04094,-0.232007 -0.191065,-0.504956 Q 14.092872,9.7715823 13.819923,9.6624026 13.560621,9.5395754 13.096607,9.4576907 12.659888,9.3621584 11.922925,9.3621584 L 8.6475347,9.3348635 q -0.027295,3.4937505 0.05459,5.8411135 z M 23.683302,1.4466309 h 0.968969 v 3.9168214 l 1.542163,-0.6141358 v 1.7332276 l -1.542163,0.6141358 v 2.811377 l 1.542163,-0.6277832 v 1.7332273 l -1.542163,0.614136 v 3.684815 h -0.968969 v -3.289039 l -3.057032,1.228272 v 4.35354 H 19.6573 V 13.647461 L 18.142432,14.24795 V 12.569312 L 19.6573,11.955176 V 9.1165041 L 18.142432,9.7169924 V 7.9837648 L 19.6573,7.3832765 V 3.7394044 h 0.96897 v 3.2480958 l 3.057032,-1.2282715 z m 0,8.8572021 V 7.4924562 L 20.62627,8.7207278 V 11.5594 Z" },
    "7" : { w: 27.399902, h: 28.722656, d: "m 14.697266,0 q 1.784668,0 3.296386,0.31494141 1.532715,0.29394531 2.393555,0.671875 0.86084,0.35693359 1.847656,0.67187499 0.986817,0.2939453 1.82666,0.2939453 0.440918,2.1416016 0.944825,6.6137696 -0.335938,0.2519531 -1.028809,0.2519531 -2.30957,-7.6425782 -9.88916,-7.6425782 -2.036621,0 -3.92627,1.0078126 Q 8.2724609,3.1704102 6.8447266,4.8920898 5.4379883,6.5927734 4.5771484,9.0493164 3.7373047,11.484863 3.7373047,14.235352 q 0,1.742675 0.461914,3.569335 0.4829102,1.826661 1.4697266,3.590333 0.9868164,1.763671 2.3515625,3.149414 1.3647461,1.364746 3.2963872,2.225586 1.952636,0.839843 4.157226,0.839843 1.700684,0 3.464356,-0.713867 1.763671,-0.713867 2.89746,-1.784668 v -6.949707 q 0,-1.196777 -0.755859,-1.553711 -0.755859,-0.356933 -2.771484,-0.524902 -0.188965,-0.188965 -0.188965,-0.545899 0,-0.377929 0.188965,-0.566894 0.923828,0.021 2.666504,0.125976 1.763672,0.08399 2.666504,0.08399 0.96582,0 2.036621,-0.08399 1.0708,-0.10498 1.532714,-0.125976 0.188965,0.188965 0.188965,0.566894 0,0.356934 -0.188965,0.545899 -1.007812,0.10498 -1.490722,0.566894 -0.48291,0.440918 -0.48291,1.511719 v 5.375 q 0,0.671875 0.671875,1.196777 -2.309571,1.973633 -5.039063,2.981446 -2.729492,1.007812 -6.382812,1.007812 -3.17041,0 -5.8999027,-1.091797 Q 5.8579102,26.539062 3.9892578,24.691406 2.1206055,22.84375 1.0498047,20.366211 0,17.867676 0,15.096191 0,12.324707 0.81884766,9.9101563 1.6376953,7.4746094 3.0444336,5.6899414 4.472168,3.8842773 6.3198242,2.6035156 8.1884766,1.3017578 10.330078,0.65087891 12.47168,0 14.697266,0 Z" },
    "8" : { w: 29.783716, h: 40.054752, d: "M 7.1512693,32.152872 H 12.14624 L 9.4576902,24.401114 H 9.3758052 L 6.441601,31.634269 q -0.095532,0.232007 0.081885,0.382129 0.1910644,0.136474 0.6277833,0.136474 z m -3.1662111,5.841114 q -0.1228271,0.245654 -0.095532,0.450366 0.040942,0.191064 0.095532,0.327539 0.05459,0.136475 0.2320069,0.245654 0.1910644,0.10918 0.354834,0.177417 0.1637695,0.06824 0.4094238,0.10918 0.2593018,0.04094 0.4640137,0.06824 0.2047119,0.02729 0.4640137,0.04094 0.1228271,0.122827 0.1228271,0.327539 0,0.191064 -0.1228271,0.313891 -0.4094238,-0.01365 -1.3920411,-0.08188 -0.9826172,-0.05459 -1.6240479,-0.05459 -0.6004883,0 -1.4739258,0.05459 -0.85979004,0.06824 -1.2965088,0.08188 Q -4.5355409e-7,39.931925 -4.5355409e-7,39.740861 q 0,-0.204712 0.12282715355409,-0.327539 1.0235596,-0.06824 1.6513428,-0.477662 0.6414307,-0.409423 1.1463868,-1.583105 L 9.4031004,22.081046 q 0.4913086,0 1.4602786,-0.559546 l 5.841113,16.267774 q 0.150122,0.409424 0.354834,0.709668 0.21836,0.286596 0.423071,0.450366 0.204712,0.163769 0.532251,0.272949 0.341187,0.09553 0.559546,0.122827 0.232007,0.0273 0.641431,0.06824 0.122827,0.122827 0.122827,0.327539 0,0.191064 -0.122827,0.313891 -0.368481,-0.01365 -1.555811,-0.08188 -1.173681,-0.05459 -1.828759,-0.05459 -0.627784,0 -1.978882,0.05459 -1.337451,0.06824 -1.678638,0.08188 -0.122827,-0.122827 -0.122827,-0.313891 0,-0.204712 0.122827,-0.327539 1.337451,-0.09553 1.66499,-0.21836 0.668726,-0.245654 0.409424,-1.009912 l -1.77417,-5.145093 H 6.6463132 q -0.4640137,0 -0.6687256,0.150122 -0.1910645,0.150122 -0.3138916,0.464014 z M 22.923998,33.967985 v 3.49375 q 1.951587,-0.750611 2.879615,-1.664991 0.941674,-0.928027 0.941674,-2.306421 0,-0.573193 -0.341186,-1.023559 -0.327539,-0.464014 -0.832495,-0.464014 -1.378394,0 -2.647608,1.965235 z m 0,-9.307569 v 8.270361 h 0.02729 q 0.764258,-1.269213 1.392041,-1.787817 0.641431,-0.532251 1.705933,-0.532251 1.173682,0 1.924292,0.723316 0.764258,0.723315 0.764258,1.815112 0,1.091797 -0.436719,1.951587 -0.423071,0.846142 -1.296509,1.487573 -0.85979,0.627783 -1.965234,1.091797 -1.091797,0.450366 -2.620313,0.846143 L 21.941381,38.403409 V 24.660416 q 0.06824,-0.06824 0.491309,-0.06824 0.423071,-0.01365 0.491308,0.06824 z M 11.499853,-2.1606684e-7 q 1.160035,0 2.142652,0.20471191606684 0.996264,0.19106446 1.55581,0.43671877 0.559546,0.23200684 1.200977,0.43671873 0.641431,0.1910645 1.187329,0.1910645 0.286597,1.392041 0.614136,4.2989503 -0.21836,0.1637695 -0.668726,0.1637695 -1.50122,-4.96767588 -6.427954,-4.96767588 -1.3238038,0 -2.5520753,0.65507818 Q 7.3237302,2.0607664 6.3957028,3.1798583 5.4813229,4.2853026 4.921777,5.8820556 4.3758786,7.4651611 4.3758786,9.2529786 q 0,1.1327394 0.3002441,2.3200684 0.3138916,1.187329 0.9553223,2.333716 0.6414307,1.146387 1.5285157,2.047119 0.887085,0.887085 2.1426514,1.446631 1.2692139,0.545898 2.7021969,0.545898 1.105445,0 2.251832,-0.464013 1.146386,-0.464014 1.883349,-1.160034 v -4.51731 q 0,-0.777905 -0.491308,-1.009912 -0.491309,-0.232007 -1.801465,-0.341187 -0.122827,-0.122827 -0.122827,-0.354834 0,-0.2456542 0.122827,-0.3684813 0.600488,0.013648 1.733227,0.081885 1.146387,0.05459 1.733228,0.05459 0.627783,0 1.323804,-0.05459 0.69602,-0.068237 0.996264,-0.081885 0.122827,0.1228271 0.122827,0.3684813 0,0.232007 -0.122827,0.354834 -0.655078,0.06824 -0.968969,0.368482 -0.313892,0.286596 -0.313892,0.982617 v 3.49375 q 0,0.436719 0.436719,0.777905 -1.501221,1.282862 -3.275391,1.93794 -1.77417,0.655078 -4.148828,0.655078 -2.0607669,0 -3.8349369,-0.709668 Q 5.7542722,17.250391 4.5396481,16.049414 3.325024,14.848438 2.6290035,13.238037 1.9466304,11.613989 1.9466304,9.8125245 q 0,-1.8014649 0.532251,-3.370923 Q 3.0111324,4.858496 3.9255123,3.6984618 4.8535397,2.5247801 6.0545163,1.692285 7.2691404,0.84614239 8.6611814,0.42307108 10.053222,-2.1606684e-7 11.499853,-2.1606684e-7 Z M 27.272583,1.6240477 h 0.96897 v 3.9168214 l 1.542163,-0.6141358 v 1.7332276 l -1.542163,0.6141358 v 2.8113773 l 1.542163,-0.6277835 v 1.7332275 l -1.542163,0.614136 v 3.684814 h -0.96897 V 12.20083 l -3.057031,1.228272 v 4.35354 h -0.96897 v -3.957764 l -1.514868,0.600488 v -1.678637 l 1.514868,-0.614136 V 9.2939209 L 21.731714,9.8944092 V 8.1611816 L 23.246582,7.5606933 V 3.9168212 h 0.96897 V 7.164917 l 3.057031,-1.2282715 z m 0,8.8572023 V 7.669873 l -3.057031,1.2282716 v 2.8386724 z" },
    "9" : { w: 29.751465, h: 28.512697, d: "m 11.001953,16.355957 h 7.68457 L 14.550293,4.4301758 H 14.424316 L 9.9101563,15.558105 q -0.1469727,0.356934 0.1259767,0.587891 0.293945,0.209961 0.96582,0.209961 z m -4.8710936,8.986328 q -0.1889649,0.37793 -0.1469727,0.692871 0.062988,0.293946 0.1469727,0.503906 0.083984,0.209961 0.3569336,0.37793 0.2939453,0.167969 0.5458984,0.272949 0.2519531,0.104981 0.6298828,0.167969 0.3989258,0.06299 0.7138672,0.104981 0.3149414,0.04199 0.7138672,0.06299 0.1889648,0.188965 0.1889648,0.503906 0,0.293945 -0.1889648,0.48291 -0.6298828,-0.021 -2.1416016,-0.125976 -1.5117187,-0.08398 -2.4985351,-0.08398 -0.9238281,0 -2.2675781,0.08398 -1.32275396,0.10498 -1.99462896,0.125976 Q 0,28.32373 0,28.029785 0,27.714844 0.18896484,27.525879 1.7636719,27.420898 2.7294922,26.791016 3.7163086,26.161133 4.4931641,24.355469 L 14.466309,0.86083984 q 0.755859,0 2.246582,-0.86083984 l 8.986328,25.027344 q 0.230957,0.629883 0.545898,1.091797 0.335938,0.440918 0.650879,0.692871 0.314941,0.251953 0.818848,0.419922 0.524902,0.146972 0.86084,0.188964 0.356933,0.04199 0.986816,0.104981 0.188965,0.188965 0.188965,0.503906 0,0.293945 -0.188965,0.48291 -0.566895,-0.021 -2.393555,-0.125976 -1.805664,-0.08398 -2.813476,-0.08398 -0.965821,0 -3.044434,0.08398 -2.057617,0.10498 -2.582519,0.125976 -0.188965,-0.188965 -0.188965,-0.48291 0,-0.314941 0.188965,-0.503906 2.057617,-0.146973 2.561523,-0.335938 1.028809,-0.377929 0.629883,-1.553711 L 19.19043,17.720703 h -8.965332 q -0.7138675,0 -1.0288089,0.230957 -0.2939453,0.230957 -0.4829102,0.713867 z" },
    "10": { w: 28.287451, h: 40.054745, d: "m 5.3684085,29.832804 h 2.1562989 q 1.8424073,0 2.9478516,-0.818848 1.105444,-0.832495 1.105444,-2.538428 0,-1.023559 -0.354834,-1.82876 -0.354834,-0.8052 -0.91438,-1.269213 -0.5595454,-0.477662 -1.1873286,-0.709668 -0.6277833,-0.245655 -1.241919,-0.245655 -0.7369629,0 -1.1873291,0.04094 -0.4503663,0.04094 -0.7233155,0.109179 -0.2593018,0.05459 -0.3821289,0.232007 -0.1091797,0.177417 -0.1364746,0.327539 -0.027295,0.150122 -0.027295,0.491309 -0.05459,3.930469 -0.05459,6.209595 z M 4.2493167,21.889981 q 0.6277832,0 1.8287598,-0.06824 1.2009766,-0.06824 1.6649903,-0.06824 1.4875733,0 2.5930172,0.286596 1.119092,0.286597 1.733228,0.709668 0.627783,0.423072 0.996265,1.050855 0.382129,0.614136 0.491308,1.160034 0.10918,0.532251 0.10918,1.173682 0,1.105444 -0.736963,2.115356 -0.736963,0.996265 -1.82876,1.555811 v 0.05459 q 1.951587,0.559546 3.084327,1.77417 1.132739,1.214624 1.132739,3.138916 0,0.777905 -0.191065,1.487573 -0.177417,0.696021 -0.668725,1.405689 -0.477661,0.709668 -1.241919,1.228271 -0.750611,0.518604 -2.006177,0.846143 -1.241919,0.313891 -2.8523195,0.313891 -1.4056885,0 -2.5247803,-0.06824 -1.1190918,-0.06824 -1.5558106,-0.06824 -0.7779053,0 -1.9106446,0.05459 -1.1190918,0.06824 -1.69228519,0.08188 -0.12282715,-0.122827 -0.12282715,-0.313891 0,-0.204712 0.12282715,-0.327539 0.55954589,-0.0273 0.85979009,-0.05459 0.3002441,-0.0273 0.6141357,-0.122827 0.3275391,-0.09553 0.4640137,-0.245655 0.1364746,-0.150122 0.2593018,-0.436718 0.1364746,-0.286597 0.177417,-0.682374 0.040942,-0.395776 0.05459,-0.996264 0.05459,-3.097974 0.05459,-5.922998 0,-2.920557 -0.05459,-6.018531 -0.013647,-0.600488 -0.05459,-0.982617 -0.040942,-0.39576 -0.177417,-0.682357 Q 2.7480959,22.981778 2.6116213,22.831656 2.4751467,22.681534 2.1612551,22.586002 1.8473635,22.476822 1.5334719,22.449527 1.2332277,22.422232 0.67368181,22.394937 0.55085466,22.27211 0.55085466,22.081046 q 0,-0.204712 0.12282715,-0.327539 0.60048829,0.01365 1.70593269,0.08188 1.1054443,0.05459 1.8697022,0.05459 z m 1.1736817,15.653638 q 0.013647,0.832496 0.504956,1.351099 0.5049561,0.518604 1.8424073,0.518604 1.2282715,0 2.1562989,-0.232007 0.9280274,-0.245655 1.4739254,-0.614136 0.559546,-0.382129 0.900733,-0.928027 0.341186,-0.559546 0.464014,-1.105445 0.122827,-0.559546 0.122827,-1.228271 0,-0.96897 -0.327539,-1.815113 Q 12.233082,32.644181 11.578003,31.975455 10.922925,31.293082 9.8447758,30.897306 8.7666264,30.501529 7.3745853,30.501529 H 5.3684085 v 0.436719 q 0,3.398218 0.05459,6.605371 z M 19.981103,33.967985 v 3.49375 q 1.951587,-0.750611 2.879615,-1.664991 0.941675,-0.928027 0.941675,-2.306421 0,-0.573193 -0.341187,-1.023559 -0.327539,-0.464014 -0.832495,-0.464014 -1.378394,0 -2.647608,1.965235 z m 0,-9.307569 v 8.270361 h 0.02729 q 0.764258,-1.269213 1.392041,-1.787817 0.641431,-0.532251 1.705933,-0.532251 1.173682,0 1.924292,0.723316 0.764258,0.723315 0.764258,1.815112 0,1.091797 -0.436719,1.951587 -0.423071,0.846142 -1.296509,1.487573 -0.85979,0.627783 -1.965234,1.091797 -1.091797,0.450366 -2.620313,0.846143 L 18.998486,38.403409 V 24.660416 q 0.06824,-0.06824 0.491309,-0.06824 0.423071,-0.01365 0.491308,0.06824 z M 7.1512699,10.631372 H 12.146241 L 9.4576908,2.8796141 H 9.3758061 L 6.4416019,10.112769 q -0.095532,0.232006 0.081885,0.382129 0.1910645,0.136474 0.627783,0.136474 z m -3.1662111,5.841114 q -0.1228271,0.245654 -0.095532,0.450366 0.040942,0.191064 0.095532,0.327539 0.05459,0.136474 0.2320069,0.245654 0.1910644,0.10918 0.354834,0.177417 0.1637695,0.06824 0.4094238,0.10918 0.2593018,0.04094 0.4640137,0.06824 0.2047119,0.0273 0.4640137,0.04094 0.1228271,0.122827 0.1228271,0.327539 0,0.191064 -0.1228271,0.313891 -0.4094239,-0.01365 -1.3920411,-0.08188 -0.9826172,-0.05459 -1.6240479,-0.05459 -0.6004883,0 -1.4739258,0.05459 -0.85979004,0.06824 -1.29650881,0.08188 Q 1.4156103e-7,18.410425 1.4156103e-7,18.219361 q 0,-0.204712 0.12282714843897,-0.327539 Q 1.1463869,17.823584 1.7741701,17.41416 2.4156008,17.004737 2.9205569,15.831055 L 9.403101,0.5595457 q 0.4913086,0 1.460278,-0.55954591606684 L 16.704493,16.267774 q 0.150122,0.409424 0.354834,0.709668 0.218359,0.286596 0.423071,0.450366 0.204712,0.163769 0.532251,0.272949 0.341187,0.09553 0.559546,0.122827 0.232007,0.02729 0.641431,0.06824 0.122827,0.122827 0.122827,0.327539 0,0.191064 -0.122827,0.313891 -0.368482,-0.01365 -1.555811,-0.08188 -1.173682,-0.05459 -1.82876,-0.05459 -0.627783,0 -1.978882,0.05459 -1.337451,0.06824 -1.678637,0.08188 -0.122828,-0.122827 -0.122828,-0.313891 0,-0.204712 0.122828,-0.327539 1.337451,-0.09553 1.66499,-0.21836 0.668726,-0.245654 0.409424,-1.009912 L 12.47378,11.518457 H 6.6463138 q -0.4640137,0 -0.6687256,0.150122 -0.1910645,0.150122 -0.3138916,0.464014 z M 25.776318,1.6240477 h 0.96897 v 3.9168214 l 1.542163,-0.6141358 v 1.7332276 l -1.542163,0.6141358 v 2.8113773 l 1.542163,-0.6277835 v 1.7332275 l -1.542163,0.614136 v 3.684814 h -0.96897 V 12.20083 l -3.057031,1.228272 v 4.35354 h -0.96897 v -3.957764 l -1.514868,0.600488 v -1.678637 l 1.514868,-0.614136 V 9.2939209 L 20.235449,9.8944092 V 8.1611816 L 21.750317,7.5606933 V 3.9168212 h 0.96897 V 7.164917 l 3.057031,-1.2282715 z m 0,8.8572023 V 7.669873 l -3.057031,1.2282716 v 2.8386724 z" },
    "11": { w: 22.717773, h: 28.155762, d: "m 7.4116211,12.429688 h 3.3173829 q 2.834473,0 4.535156,-1.259766 1.700684,-1.2807618 1.700684,-3.9052736 0,-1.574707 -0.545899,-2.8134765 -0.545898,-1.2387696 -1.406738,-1.9526367 -0.86084,-0.7348633 -1.82666,-1.0917969 -0.96582,-0.3779297 -1.910645,-0.3779297 -1.133789,0 -1.8266598,0.062988 -0.6928711,0.062989 -1.112793,0.167969 Q 7.9365234,1.34375 7.7475586,1.6166992 7.5795898,1.8896484 7.5375977,2.1206055 7.4956055,2.3515625 7.4956055,2.8764648 7.4116211,8.9233398 7.4116211,12.429688 Z M 5.6899414,0.20996094 q 0.9658203,0 2.8134766,-0.10498047 Q 10.351074,0 11.064941,0 q 2.288575,0 3.989258,0.44091797 1.72168,0.44091797 2.666504,1.09179683 0.96582,0.650879 1.532715,1.6166993 0.587891,0.9448242 0.755859,1.7846679 0.167969,0.8188477 0.167969,1.8056641 0,1.7006836 -1.133789,3.2543945 -1.133789,1.5327144 -2.813477,2.3935544 v 0.08398 q 3.002442,0.86084 4.745118,2.729492 1.742675,1.868652 1.742675,4.829101 0,1.196778 -0.293945,2.288575 -0.272949,1.0708 -1.028808,2.162597 -0.734864,1.091797 -1.910645,1.889649 -1.154785,0.797851 -3.086426,1.301758 -1.910644,0.48291 -4.388183,0.48291 -2.162598,0 -3.8842777,-0.104981 -1.7216797,-0.10498 -2.3935547,-0.10498 -1.1967774,0 -2.9394531,0.08398 -1.7216797,0.10499 -2.60351566,0.125986 Q 0,27.966797 0,27.672852 0,27.35791 0.18896484,27.168945 1.0498047,27.126955 1.5117187,27.084965 1.9736328,27.042975 2.456543,26.896 q 0.5039062,-0.146973 0.7138672,-0.37793 0.2099609,-0.230957 0.3989257,-0.671875 0.209961,-0.440918 0.2729493,-1.049804 0.062988,-0.608887 0.083984,-1.532715 0.083984,-4.766113 0.083984,-9.112305 0,-4.4931639 -0.083984,-9.2592772 Q 3.9052734,3.9682617 3.8422852,3.3803711 3.7792969,2.7714844 3.5693359,2.3305664 3.3803711,1.8896484 3.1704102,1.6586914 2.9604492,1.4277344 2.4775391,1.2807617 1.9946289,1.112793 1.5117187,1.0708008 1.0498047,1.0288086 0.18896484,0.98681641 0,0.79785156 0,0.50390625 0,0.18896484 0.18896484,0 1.112793,0.02099609 2.8134766,0.12597656 4.5141602,0.20996094 5.6899414,0.20996094 Z M 7.4956055,24.29248 q 0.020996,1.280762 0.7768554,2.078614 0.7768555,0.797851 2.8344731,0.797851 1.889648,0 3.317382,-0.356933 1.427735,-0.37793 2.267579,-0.944825 0.860839,-0.58789 1.385742,-1.427734 0.524902,-0.86084 0.713867,-1.700683 0.188965,-0.86084 0.188965,-1.889649 0,-1.490723 -0.503907,-2.79248 Q 17.972656,16.754883 16.964844,15.726074 15.957031,14.67627 14.29834,14.067383 12.639648,13.458496 10.498047,13.458496 H 7.4116211 v 0.671875 q 0,5.228027 0.083984,10.162109 z" }
}

const SVG_PATHS_NOTEHEADS = {
    "w" : { w: 66.605927, h: 48.21759, d: "M 33.400557,0 C 8.7617284,0 0,12.5009 0,24.1088 c 0,11.60789 8.7617284,24.10879 33.400557,24.10879 24.638918,0 33.205366,-12.5009 33.205366,-24.10879 C 66.605923,12.5009 58.039475,0 33.400557,0 m 1.423128,42.49722 c -4.994788,0 -8.398937,-1.42304 -10.71498,-5.88761 -2.316043,-4.46458 -5.524822,-16.07247 -5.720192,-20.73238 -0.362702,-4.82731 1.423128,-7.67348 5.720192,-9.09657 2.148532,-0.72544 4.994788,-1.08832 7.868903,-1.08832 4.799418,0 8.036235,1.08832 10.51961,5.91565 2.511234,4.63199 5.915562,16.23989 5.915562,20.70447 0,8.76172 -6.445775,10.18476 -13.589095,10.18476" },
    "h" : { w: 58.039474, h: 47.32449, d: "M 38.032643,0 C 20.704556,0 0,14.48192 0,31.08457 c 0,7.67348 5.5249116,16.23992 20.006832,16.23992 18.556024,0 38.032643,-15.17959 38.032643,-30.88932 C 58.039475,5.88761 49.110325,0 38.032643,0 M 13.393725,38.92547 c -5.8876494,0 -7.14332,-4.79942 -7.14332,-6.41783 0,-8.76173 29.996408,-24.10871 38.395345,-24.10871 4.297243,0 7.14332,2.51133 7.14332,6.41783 0,8.92915 -30.191599,24.10871 -38.395345,24.10871" },
    "q" : { w: 58.039474, h: 47.32449, d: "m 0,31.08457 c 0,7.67348 5.5249116,16.23992 20.006832,16.23992 18.556024,0 38.032643,-15.17959 38.032643,-30.88932 C 58.039475,5.88761 49.110325,0 38.032643,0 20.704556,0 0,14.64934 0,31.08457" }
}

const SVG_PATHS_CLEFS = {
    "C" : { w: 111.9771, h: 171.80238, l: 3, y: 3.008/* 67.861 */, d: "m 111.9771,132.70949 c 0,-22.15554 -11.7753,-39.483631 -35.1864,-39.483631 -4.1019,0 -7.1433,0.36276 -14.0913,4.632 -0.3627,-0.69758 -3.9343,-7.8409 -9.822,-11.94274 5.8877,-4.12973 9.4593,-11.27305 9.822,-11.97065 6.7806,4.10184 9.0965,4.632 16.77,4.632 21.7927,0 32.5077,-20.17429 32.5077,-39.45572 C 111.9771,14.11913 93.5887,0 71.9634,0 58.5697,0 39.4558,5.524823 39.4558,21.959995 c 0,8.761817 6.0829,14.482014 14.8447,14.482014 7.8408,0 13.3937,-5.720197 13.3937,-13.589099 0,-9.822065 -6.4458,-13.030845 -15.0122,-13.030845 4.1019,-2.846255 9.6547,-4.464575 15.1795,-4.464575 18.7513,0 21.7927,15.012045 21.7927,31.084519 0,13.75642 -0.3627,33.73549 -16.0725,33.73549 -15.7096,0 -18.9185,-16.96548 -19.2812,-18.75131 0,-0.16733 0,-2.48337 -2.5114,-2.48337 -2.4834,0 -2.6788,2.31604 -2.6788,2.48337 -1.5904,9.82207 -6.4177,26.98286 -16.4351,31.08469 V 4.631908 c 0,-1.227758 -0.893,-2.316043 -2.1486,-2.316043 -1.2277,0 -2.316,1.088285 -2.316,2.316043 V 167.17048 c 0,1.25561 1.0883,2.31586 2.316,2.31586 1.2556,0 2.1486,-1.06025 2.1486,-2.31586 V 89.291469 c 10.5474,4.29715 14.482,21.262481 16.4351,31.252061 0,0.19537 0.1954,2.31604 2.6788,2.31604 2.5114,0 2.5114,-2.12067 2.5114,-2.31604 0.3627,-1.95334 3.5716,-18.91868 19.2812,-18.91868 15.7098,0 16.0725,20.00696 16.0725,33.76339 0,16.07247 -3.0414,31.05665 -21.7927,31.05665 -5.5248,0 -11.0776,-1.59046 -15.1795,-4.46457 0.1954,0 0.8929,0.19537 1.9812,0.19537 7.8408,0 13.031,-5.55286 13.031,-13.22639 0,-7.86873 -5.5529,-13.56106 -13.3937,-13.56106 -8.7618,0 -14.8447,5.69233 -14.8447,14.45397 0,16.60268 19.1139,21.96017 32.5076,21.96017 21.6253,0 40.0137,-14.09127 40.0137,-39.09289 M 2.316,2.315865 C 1.0603,2.315865 0,3.40415 0,4.631908 V 167.17048 c 0,1.25561 1.0603,2.31586 2.316,2.31586 h 12.8636 c 1.2556,0 2.316,-1.06025 2.316,-2.31586 V 4.631908 c 0,-1.227758 -1.0604,-2.316043 -2.316,-2.316043 H 2.316" },
    "F" : { w: 118.5904, h: 155.00452, l: 4, y: -0.168/* 64.485 */, d: "M 45.3713,0 C 31.7822,0 20.8997,7.841043 20.7046,7.841043 10.1848,15.514398 3.4042,27.317698 3.4042,40.348687 c 0,13.03099 7.4782,22.68558 20.7045,22.68558 11.4406,0 20.3697,-7.67345 20.3697,-19.47667 0,-10.18481 -8.9291,-18.555977 -18.9466,-18.555977 -2.1485,0 -4.1018,0.334843 -5.7202,0.892915 -1.7858,0.697723 -4.7995,2.4835 -6.2505,3.73917 1.2557,-7.868902 6.6132,-15.709767 13.5891,-19.476797 4.4645,-2.483375 10.1849,-3.57166 16.4353,-3.57166 18.221,0 27.1502,14.64952 27.1502,44.645839 0,23.21588 -14.8448,56.616443 -32.3404,72.354063 -18.5837,16.96539 -36.0793,25.00162 -36.2467,25.00162 0,0 -2.1486,1.22776 -2.1486,3.37629 0,0.36271 0.1674,0.53022 0.1674,0.89292 0.5581,1.78583 2.1486,2.14853 3.4043,2.14853 l 0.5301,-0.16733 c 0.3628,0 20.7325,-8.39894 36.9723,-21.09512 C 66.0757,115.71625 94.2863,83.934187 94.2863,51.063667 94.2863,19.978973 77.5163,0 45.3713,0 m 56.0583,22.657718 c 0,5.022736 3.9344,8.929239 8.5943,8.929239 4.6319,0 8.5665,-3.906503 8.5665,-8.929239 0,-4.99461 -3.9346,-9.096483 -8.5665,-9.096483 -4.6599,0 -8.5943,4.101873 -8.5943,9.096483 m 0,44.115719 c 0,4.99478 3.9344,9.12452 8.5943,9.12452 4.6319,0 8.5665,-4.12974 8.5665,-9.12452 0,-4.99479 -3.9346,-9.09661 -8.5665,-9.09661 -4.6599,0 -8.5943,4.10182 -8.5943,9.09661" },
    "G" : { w: 114.29312, h: 317.54272, l: 2, y: -64.653/* 0 */, d: "m 21.96017,290.1972 c 0,11.80326 8.92915,27.34552 33.03786,27.34552 8.39893,0 15.73762,-2.14853 22.15536,-6.08307 9.65473,-6.78044 12.13811,-18.58371 12.13811,-29.8289 0,-6.94795 -1.06025,-14.98419 -2.84608,-25.16895 -0.53021,-3.57166 -1.6185,-8.92915 -2.67874,-15.90514 17.49542,-5.72019 30.52644,-23.9412 30.52644,-42.32975 0,-26.95492 -19.11392,-45.17592 -45.17596,-45.17592 C 67.33133,142.33601 65.5455,131.78836 64.12255,121.79896 82.87376,101.95946 95.90461,79.636589 95.90461,51.258678 95.90461,34.990839 90.91,21.792483 88.03588,15.347423 83.76668,6.250405 78.57652,0 75.36756,0 74.11195,0 68.58712,2.1483535 62.69942,9.097018 51.25886,22.685398 48.05008,45.538486 48.05008,60.522672 c 0,9.654554 0.89291,18.416371 3.93436,38.423204 -0.19537,0.16751 -9.48722,9.626694 -13.22639,12.668324 C 22.49039,126.62624 0,148.39104 0,184.13559 c 0,33.37279 29.10349,59.63003 62.33672,59.63003 5.16212,0 9.98939,-0.53022 14.09127,-1.25562 3.40415,17.16058 5.55286,29.66139 5.55286,39.12075 0,18.58388 -9.65474,28.40595 -27.68037,28.40595 -4.29724,0 -8.03623,-0.89292 -8.39911,-0.89292 -0.16734,-0.19537 -0.53004,-0.36288 -0.53004,-0.53021 0,-0.3627 0.3627,-0.55807 0.89292,-0.55807 8.39893,-1.42313 16.77001,-8.56645 16.77001,-19.97898 0,-9.65473 -7.31083,-19.8395 -20.70455,-19.8395 -12.50081,0 -20.36954,10.18477 -20.36954,21.96018 M 59.29509,51.788891 c 1.6185,-7.14332 9.82207,-25.894535 19.1141,-25.894535 2.67874,0 6.94795,8.56627 6.94795,21.06708 0,18.583882 -13.72857,32.50782 -26.06205,44.64575 -1.06025,-7.14332 -1.95316,-14.09127 -1.95316,-21.597293 0,-6.613107 0.53021,-12.696179 1.95316,-18.221002 M 75.00486,235.36668 c -3.57166,0.7254 -6.94795,1.08811 -10.35228,1.08811 -25.53165,0 -47.32444,-17.8583 -47.32444,-44.84103 0,-21.7649 15.34701,-41.24152 31.08464,-54.83061 3.01359,-2.67875 5.8877,-5.16212 8.56645,-7.84087 1.59046,9.6267 2.84607,18.02564 4.10169,25.36433 -16.26766,4.82727 -27.31748,21.96017 -27.31748,38.75813 0,12.50081 9.82206,29.63362 24.1087,29.63362 1.42295,0 3.04145,-0.72541 3.04145,-2.31604 0,-1.61832 -1.78583,-2.51124 -3.93436,-3.93437 -6.97599,-4.29715 -10.91035,-8.92915 -10.91035,-17.69087 0,-10.88241 8.2316,-19.64422 18.5837,-22.1276 l 10.35228,58.7372 m 25.36432,-33.03794 c 0,12.69614 -5.18998,25.72711 -17.8583,30.91727 -3.73899,-21.43005 -8.56627,-49.83591 -9.82206,-57.70481 16.07247,0 27.68036,10.91038 27.68036,26.78754" }
}

const SVG_PATHS_ACCIDENTALS = {
    "n" : { w: 30.526621, h: 115.71625, y: 0.0, d: "m 29.633706,25.36433 c -0.334843,-0.36271 -0.892915,-0.53022 -1.590639,-0.53022 l -0.362702,0.16751 c 0,0 -0.167332,0 -0.167332,0 L 4.9947522,31.25203 V 0 H 0 v 88.39859 c 0,1.95334 1.6184084,2.31604 3.2089222,2.31604 l 22.5182808,-6.2504 v 31.25202 h 4.799418 c 0,-29.6337 0,-57.84419 0,-88.39858 0,-0.69773 -0.334843,-1.59064 -0.892915,-1.95334 M 4.9947522,75.36762 V 46.06883 L 25.727203,40.18118 V 69.64737 L 4.9947522,75.36762" },
    "s" : { w: 43.585503, h: 119.12057, y: 0.0, d: "m 41.604303,40.90675 c 1.088285,-0.16751 1.9812,-1.42312 1.9812,-2.51141 V 27.87573 c 0,-1.78583 -1.255796,-2.51123 -2.874115,-2.51123 l -5.887703,1.25561 V 0 H 29.828897 V 27.68036 L 13.923902,30.91718 V 5.72037 H 8.92915 V 31.9776 L 1.9532516,33.40073 C 0.892915,33.59592 0,34.82368 0,35.91197 v 10.35227 c 0,1.95326 1.4230833,2.51133 3.0415006,2.51133 L 8.92915,47.5199 V 76.98611 L 1.9532516,78.40918 C 0.892915,78.5767 0,79.83231 0,80.9206 v 10.3521 c 0,1.95334 1.4230833,2.48355 3.0415006,2.48355 L 8.92915,92.52849 v 26.59208 h 4.994752 V 91.44021 l 15.904995,-3.20896 v 25.19699 h 4.994788 V 87.171 l 6.780618,-1.25579 c 1.088285,-0.19519 1.9812,-1.42295 1.9812,-2.51124 v -10.5197 c 0,-1.78583 -1.255796,-2.51132 -2.874115,-2.51132 l -5.887703,1.25567 V 42.16241 l 6.780618,-1.25566 M 13.923902,46.43167 29.828897,43.22274 V 72.68896 L 13.923902,76.0932 V 46.43167" },
    "f" : { w: 36.246815, h: 112.31211, y: -24.0, d: "m 21.42996,53.21219 c -8.92915,0 -14.1192184,5.52483 -15.0121334,6.61311 L 7.14332,2.48337 C 7.14332,1.06042 6.0829834,0 4.6319966,0 H 2.5113234 C 1.0603366,0 0,1.06042 0,2.48337 l 0.892915,107.34517 c 0,1.42313 1.0603366,2.48356 2.5113234,2.48356 0.3348432,0 1.0603366,-0.16752 1.4230922,-0.33485 15.3470124,-7.70139 31.4194824,-22.32296 31.4194824,-40.73933 0,-9.26409 -4.269205,-18.02573 -14.816853,-18.02573 M 5.8876672,103.57814 6.4178266,68.75449 c 0.3627556,-1.61841 3.0415006,-6.78066 10.1848204,-6.78066 6.445811,0 6.975845,6.05516 6.975845,9.82216 0,15.87715 -5.887614,22.49029 -17.6908248,31.78215" }
}

const SVG_ICONS = {
    close: { w: 13.229, h: 13.229, d: "M 1.4140625,0 0,1.4140625 5.1992187,6.6132812 0,11.814453 1.4140625,13.228516 6.6132812,8.0273438 11.814453,13.228516 13.228516,11.814453 8.0273438,6.6132812 13.228516,1.4140625 11.814453,0 6.6132812,5.1992187 Z" },
    magnifier: { w: 13.229, h: 13.229, d: "m 4.9263143,5.1676432e-4 c -1.2629519,0 -2.5261804,0.47979364568 -3.4860921,1.43970543568 -1.91982354,1.9198234 -1.91982354,5.0518439 0,6.9716674 1.4976053,1.4976051 3.7159206,1.7892114 5.5381632,0.9503296 l 3.6183836,3.6183838 c 0.316988,0.316988 0.725094,0.271989 0.979269,0.186552 0.254175,-0.08544 0.464369,-0.232343 0.65629,-0.424264 l 0.510563,-0.510563 c 0.191921,-0.191921 0.338824,-0.402118 0.424264,-0.65629 0.08544,-0.254175 0.130436,-0.662281 -0.186552,-0.979269 L 9.3622192,6.9783854 C 10.201101,5.1561428 9.9094947,2.9378275 8.4118896,1.4402222 7.4519779,0.48031041 6.1892662,5.1676432e-4 4.9263143,5.1676432e-4 Z m 0,1.31413163568 c 0.9218485,0 1.8436131,0.3537817 2.5507487,1.0609172 1.4142709,1.4142712 1.414271,3.6872263 0,5.1014974 -1.4142711,1.414271 -3.6872262,1.4142709 -5.1014974,0 -1.41427109,-1.4142711 -1.41427109,-3.6872262 0,-5.1014974 C 3.0827012,1.6684301 4.0044658,1.3146484 4.9263143,1.3146484 Z m 3.6886637,6.7892497 3.193087,3.1930869 -0.51108,0.51108 L 8.1038981,8.614978 C 8.1996134,8.5329806 8.2675896,8.4693732 8.3581462,8.3788167 8.4487027,8.2882601 8.5329382,8.199571 8.614978,8.1038981 Z" },
}
