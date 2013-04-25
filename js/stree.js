// Mariano Casco <muy.poca.fe@gmail.com>
// http://github.com/mdsn/stree
// MIT License

App = {
    debug: true,
    R: null,
    examples: [
        "[S [NP_1 -This-] [VP [V is<1>(yabba)] [^NP a wug]]]",
        "[CP [NP^_1 What] [C' [C_c did] [IP_2 [NP^ you] [I' [I tr<c>] [VP [V' [V eat] tr<1>]]]]]]",
        "[S [NP [N Alice]] [VP [V is][NP [N' [N a student] [PP^ of physics]]]]]",
        "[SC V(Decl) [STop Cuando [Top' [TP^ lo vi] [ST pro [T' estaba sonriendo [Sv (pro) [v' [v+V -sonreir-] [SV [SA felizmente [A' -mente- [SC como [C' si [SFoc no [Foc' V [ST hubiese [T' pasado [Sv [v+V -pasar-] [SV nada(algo) [V' -pasar- [V'<Locación> V] ] ] ] ] ] ] ] ] ] ] ] [SV [SC -cuando- [ST pro [T' -lo vi- [Sv (pro) [v' [v+V -ver-] [SV -ver- [SD (lo)] ] ] ] ] ] ] [SV (pro) [V' -sonreir-] ] ] ] ] ] ] ] ] ] ]",
    ],
    hoverElement: null,
    init: function() {
        this.bind();
        this.insert_examples();

        $('#stage').val($('#examples-list li').first().find('a').text());
    },
    bind: function() {
        var that = this;
        $('#parse').click(function(e) {
            var s = $('#stage').val()
            if (s == '')
                return;
            $('#log').empty();
            var tree = syntax_tree(s);
        });
        $(document).on('click', '.example-link', function(e) {
            $('#stage').val($(this).text());
        });
        $(document).on('click', '#editor-save', function(e) {
            saveSelection();
        });
    },
    insert_examples: function() {
        $.each(this.examples, function(i, eg) {
            var li = $('<div/>').html('<li><a href="#"></a></li>').children();
            $(li).find('a')
                .prop('id', 'example-' + i)
                .text(eg)
                .addClass('example-link');
            $('#examples-list').append(li);
        });
    },
    log: function(msg) {
        msg = msg.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        $('#log').append(msg + '<br/>');
    },
};

Tree = {
    h_margin: 30,
    v_margin: 30,
    h_space: 25, /* Horizontal space between sibling nodes */
    v_space: 45, /* Vertical space between levels */
    movement_bottom: 40,
    padding_bottom: 5, /* Space below the text for the lines */
    padding_top: 5,
    font_size: 14,
    node_text_separation: 3,

    /* Binds the events related to interaction: hover (shows the bounding box
     * of the entire node), click (should instance the node editor for the
     * selected node)
     */
    bindEvents: function(node) {
        var set = node.elements;
        var f = function(x) {
            return Math.floor(x) + 0.5;
        };
        set.mouseup(function(e) {
            if (App.selectedElement) {
                App.selectedElement.box.remove();
                App.selectedElement = null;
            }
            var box = set.getBBox();
            node.box = App.R.rect(f(box.x), f(box.y), box.width, box.height);
            node.box.attr({
                stroke: 'green',
            });
            App.selectedElement = node;
            elementSelected(node);
        }).hover(
            function(e) {
                if (App.hoverElement)
                    App.hoverElement.remove();
                var box = set.getBBox();
                App.hoverElement = App.R.rect(f(box.x), f(box.y), box.width, box.height);
            },
            function(e) {
                if (App.hoverElement)
                    App.hoverElement.remove();
            }
        );
    },
};

function syntax_tree(s) {
    var t = parse(s);
    t.relate(null);
    t.check_triangles();

    if (App.R)
        App.R.clear();
    else
        App.R = new Raphael('canvas-container', 500, 500);
    var R = App.R;
    var treeSet = R.set();

    t.set_width(treeSet);
    t.assign_location(0, 0);
    t.do_strikeout(treeSet);
    t.find_height();
    
    var movement_lines = new Array();
    t.find_movements(movement_lines, t);
    for (var i = 0; i < movement_lines.length; i++) {
        t.reset_chains();
        movement_lines[i].set_up();
    }

    t.draw_tree_lines(treeSet);
    for (var i = 0; i < movement_lines.length; i++) {
        if (movement_lines[i].should_draw)
            movement_lines[i].draw(treeSet);
    }

    /* Move the entire tree */
    treeSet.translate(t.left_width + Tree.h_margin, Tree.v_margin);

    /* Control the paper size taking into account the movement lines */
    var height = t.max_y + (2*Tree.v_space);
    for (var i = 0; i < movement_lines.length; i++)
        if (movement_lines[i].max_y == t.max_y) {
            height += Tree.v_margin;
            break;
        }

    /* Resize the paper so it can show the entire tree */
    R.setSize(t.left_width + (2*Tree.h_margin) + t.right_width, height);
    return t;
};

function saveSelection() {
    var node = App.selectedElement;
    node.value = $('#editor-value').val();
    node.text.attr('text', node.value);
    node.strikeout = $('#editor-strikeout').prop('checked');
};

function elementSelected(node) {
    $('#editor-value').val(node.value);
    $('#editor-features').val(node.features);
    $('#editor-strikeout').prop('checked', node.strikeout);
};

function subscript(s) {
    var out = '';
    for (var i = 0; i < s.length; i++) {
        switch (s[i]) {
            case '0': out = out + '₀'; break;
            case '1': out = out + '₁'; break;
            case '2': out = out + '₂'; break;
            case '3': out = out + '₃'; break;
            case '4': out = out + '₄'; break;
            case '5': out = out + '₅'; break;
            case '6': out = out + '₆'; break;
            case '7': out = out + '₇'; break;
            case '8': out = out + '₈'; break;
            case '9': out = out + '₉'; break;
        }
    }
    return out;
};

function parse(s) {
    App.log('Parsing ' + s);
    var n = new Node();

    if (s[0] != '[') {
        /* Search for movement information */
        s = s.replace(/\s*<(\w+)>\s*/, function(match, tail) {
            n.tail = tail;
            App.log('Found tail: ' + tail);
            return ' ';
        });
        s = s.replace(/^\s+|\s+$/g, '');
        /* Search for features on this text node */
        var i = 0;
        while ((i < s.length) && (s[i] != '(')) i++;
        n.value = s.substring(0, i); /* Save the text node */

        if (s[i] == '(') {
            var start = i+1;
            while ((s[i] != ')')) i++;
            n.features = s.substring(start, i);
            App.log('Parsed features: ' + n.features);
        }

        n.value = n.value.replace(/^-([-\s\w]+)-$/, function(match, text) {
            n.strikeout = true;
            return text;
        });

        return n;
    }

    /* Parse the category label */
    var i = 1;
    while ((s[i] != ' ') && (s[i] != '[') && (s[i] != ']')) i++;
    n.value = s.substring(1, i);
    /* Triangle-parent node */
    n.value = n.value.replace(/\^/, function() {
        n.caret = true;
        return '';
    });
    /* Label */
    n.value = n.value.replace(/_(\w+)$/, function(match, label) {
        App.log('Parsed label: ' + label);
        n.label = label;
        if (n.label.search(/^\d+$/) != -1)
            return subscript(n.label);
        return '';
    });
    App.log('Parsed first token: ' + n.value);

    while (s[i] == ' ') i++;
    var level = 1,
        start = i;
    for (; i < s.length; i++) {
        var outer_level = level;
        if (s[i] == '[') level++;
        if (s[i] == ']') level--;

        if (((outer_level == 1) && (level == 2)) || ((outer_level == 1) && (level == 0))) {
            /* Handle word token */
            if (s.substring(start, i).search(/\w+/) > -1)
               n.children.push(parse(s.substring(start, i)));
            start = i;
        }
        /* Parse an inside bracket group */
        if ((outer_level == 2) && (level == 1)) {
            n.children.push(parse(s.substring(start, i+1)));
            /* Otherwise we get the closing ] again and an extra level-- */
            start = i+1;
        }
    }
    return n;
};


$(function() {
    App.init();
});
