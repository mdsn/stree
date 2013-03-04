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
        $('#log').append(msg + '<br/>');
    },
};

Tree = {
    h_space: 50, /* Horizontal space between sibling nodes */
    v_space: 40, /* Vertical space between levels */
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

    this.x = null;
    this.y = null;

    this.child_step = null;
    this.left_width = null;
    this.right_width = null;

    this.text = null; /* Raphael text element */
    this.value = null;
    this.parameters = null;
};

function syntax_tree(s) {
    var t = parse(s);
    t.relate(null);

    App.R = new Raphael('canvas-container', 500, 500);
    App.set = App.R.set();
    var R = App.R;
    var set = App.set;

    t.set_width();
    t.assign_location(0, 0);
    //set.push(R.path('M-250,0L0,0'));

    set.translate(250, 250);
    return t;
};

function text_element(n) {
    var text = App.R.text(0, 0, n.value);
    text.attr({
        'font-size': 16,
    });
    App.set.push(text);
    return text;
};

/* Traverse the tree post-order, set the location of each children according to
 * the step value found in set_width */
Node.prototype.assign_location = function(x, y) {
    this.x = x;
    this.y = y;

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
     * that of its text (TODO: Measure parameters, get max) */
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

function parse(s) {
    App.log('Parsing <i>' + s + '</i>');
    var n = new Node();

    if (s[0] != '[') {
        s = s.replace(/^\s+|\s+$/g, '');
        /* Search for parameters on this text node */
        var i = 0;
        while ((i < s.length) && (s[i] != '(')) i++;
        n.value = s.substring(0, i); /* Save the text node */

        if (s[i] == '(') {
            var start = i+1;
            while ((s[i] != ')')) i++;
            n.parameters = s.substring(start, i);
        }
        return n;
    }

    /* Parse the category label */
    var i = 1;
    while ((s[i] != ' ') && (s[i] != '[') && (s[i] != ']')) i++;
    n.value = s.substring(1, i+1);
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
