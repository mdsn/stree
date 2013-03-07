App = {
    debug: true,
    R: null,
    init: function() {
        this.bind();
    },
    bind: function() {
        var that = this;
        $('#parse').click(function(e) {
            var s = $('#stage').val()
            if (s == '')
                return;
            $('#log').empty();
            var tree = syntax_tree(s);
            1+1==2;
        });
    },
    log: function(msg) {
        msg = msg.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        $('#log').append(msg + '<br/>');
    },
};

Tree = {
    h_space: 50, /* Horizontal space between sibling nodes */
    v_space: 60, /* Vertical space between levels */
    padding_bottom: 5, /* Space below the text for the lines */
    padding_top: 5,
};

function Node() {
    this.parent = null;

    this.has_children = null;
    this.children = new Array();
    this.first = null;
    this.last = null;
    /* Siblings */
    this.previous = null;
    this.next = null;

    /* Coordinates for the center of the node's text element */
    this.x = null;
    this.y = null;

    this.child_step = null;
    this.left_width = null;
    this.right_width = null;

    this.caret = null; /* true if the element has a caret indicating a triangle */
    this.draw_triangle = null; /* true if this is the child of a caret node */
    this.tail = null;

    this.text = null; /* Raphael text element */
    this.value = null;
    this.features = null;
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
    R.setStart();

    t.set_width();
    t.assign_location(0, 0);
    t.draw_tree_lines();

    /* Move the entire tree */
    var set = R.setFinish();
    set.translate(t.left_width + Tree.h_space, Tree.v_space);

    /* Resize the paper so it can show the entire tree */
    R.setSize(t.left_width + (2*Tree.h_space) + t.right_width, 500);
    return t;
};

function text_element(n) {
    var text = App.R.text(0, 0, n.value);
    text.attr({
        'font-size': 16,
    });
    return text;
};

/* Get the y coordinate over this node */
Node.prototype.top_y = function() {
    return Math.floor(this.y - (this.text.getBBox().height / 2) - Tree.padding_top) + 0.5;
};

/* Get the y coordinate under this node */
Node.prototype.bottom_y = function() {
    return Math.floor(this.y + (this.text.getBBox().height / 2) + Tree.padding_bottom) + 0.5;
};

/* Mark nodes under a triangle */
Node.prototype.check_triangles = function() {
    this.draw_triangle = false;
    if ((!this.has_children) && (this.parent.caret))
        this.draw_triangle = true;

    for (var child = this.first; child != null; child = child.next)
        child.check_triangles();
};

/* Traverse the tree post-order and draw the lines connecting each node with
 * its parent */
Node.prototype.draw_tree_lines = function() {
    for (var child = this.first; child != null; child = child.next)
        child.draw_tree_lines();

    /* Do nothing for the root node */
    if (!this.parent) return;

    if (this.draw_triangle) {
        var from = 'M' + this.parent.x + ',' + this.parent.bottom_y();
        var to1 = 'L' + (this.x - this.left_width) + ',' + this.top_y();
        var to2 = 'L' + (this.x + this.right_width) + ',' + this.top_y();
        var to3 = from.replace(/M/, 'L');
        App.R.path(from + to1 + to2 + to3);
        return;
    }

    /* Regular line to the parent */
    var from = 'M' + this.parent.x + ',' + this.parent.bottom_y();
    var to = 'L' + this.x + ',' + this.top_y();
    App.R.path(from + to);
};

/* Traverse the tree post-order, set the location of each children according to
 * the step value found in set_width */
Node.prototype.assign_location = function(x, y) {
    this.x = Math.floor(x) + 0.5;
    this.y = Math.floor(y) + 0.5;

    this.text.transform(['T' + x + ',' + y]);

    /* Treat x = 0 as the center of the canvas because we'll transpose it later */
    if (this.has_children) {
        var left_start = x - (this.step * (this.children.length-1) / 2);
        for (var i = 0; i < this.children.length; i++)
            this.children[i].assign_location(left_start + i*(this.step), y + Tree.v_space);
    }
};

/* Traverse the tree post-order, set the space on each side of a node */
Node.prototype.set_width = function() {
    this.text = text_element(this);
    var text_width = this.text.getBBox().width;

    for (var child = this.first; child != null; child = child.next)
        child.set_width();

    /* As leaf nodes are not affected by children, their width is just
     * that of its text (TODO: Measure features, get max) */
    if (!this.has_children) {
        this.left_width = text_width / 2;
        this.right_width = text_width / 2;
        return;
    }

    /* Space between children's centers is the max one so they're all
     * equally separated. */
    this.step = 0;
    for (var child = this.first; (child != null) && (child.next != null); child = child.next) {
        var space = child.right_width + Tree.h_space + child.next.left_width;
        this.step = Math.max(this.step, space);
    }

    /* Parent width itself is defined by the widths of all its children */
    this.left_width = 0.0;
    this.right_width = 0.0;

    /* childs - 1 because we need the sections, not the fence posts.
     * We get the distance from the first-center to the last-center, so
     * we need to add the left and right widths respectively. */
    var children_width = ((this.children.length - 1) * this.step) / 2;
    this.left_width = children_width + this.first.left_width;
    this.right_width = children_width + this.last.right_width;

    /* Check if this node isn't wider than all of its children */
    this.left_width = Math.max(this.left_width, text_width / 2);
    this.right_width = Math.max(this.right_width, text_width / 2);
};

/* Sets parent and sibling nodes for a given (sub)tree */
Node.prototype.relate = function(parent) {
    this.parent = parent;
    this.has_children = (this.children.length > 0);

    if (this.has_children) {
        this.first = this.children[0];
        this.last = this.children[this.children.length - 1];
    }

    for (var i = 0; i < this.children.length; i++)
        this.children[i].relate(this);

    for (var i = 0; i < this.children.length - 1; i++)
        this.children[i].next = this.children[i+1];

    for (var i = 1; i < this.children.length; i++)
        this.children[i].previous = this.children[i-1];
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
