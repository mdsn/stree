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
        });
    },
    log: function(msg) {
        msg = msg.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        $('#log').append(msg + '<br/>');
    },
};

Tree = {
    h_space: 40, /* Horizontal space between sibling nodes */
    v_space: 50, /* Vertical space between levels */
    movement_bottom: 40,
    padding_bottom: 5, /* Space below the text for the lines */
    padding_top: 5,
    font_size: 14,
    node_text_separation: 3,
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

    this.max_y = null;
    this.child_step = null;
    this.left_width = null;
    this.right_width = null;

    this.caret = null; /* true if the element has a caret indicating a triangle */
    this.draw_triangle = null; /* true if this is the child of a caret node */

    this.head_chain = null;
    this.tail_chain = null;
    this.tail = null;
    this.label = null;

    this.strikeout = null;
    this.text = null; /* Raphael text element */
    this.features_el = null;
    this.value = null;
    this.features = null;
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
    if (this.features) {
        this.features_el.transform(['T' + x + ',' + y]);
    }

    /* Treat x = 0 as the center of the canvas because we'll transpose it later */
    if (this.has_children) {
        var left_start = x - (this.step * (this.children.length-1) / 2);
        for (var i = 0; i < this.children.length; i++)
            this.children[i].assign_location(left_start + i*(this.step), y + Tree.v_space);
    }
};

/* Search for the node with the corresponding label (_l) */
Node.prototype.find_head = function(label) {
    for (var child = this.first; child != null; child = child.next) {
        var head = child.find_head(label);
        if (head != null) 
            return head;
    }

    if (this.label == label)
        return this;
    return null;
};

/* Traverse the tree searching for nodes marked as tails (<label>), and create
 * movements connecting them with the corresponding heads, if any */
Node.prototype.find_movements = function(movs, root) {
    for (var child = this.first; child != null; child = child.next)
        child.find_movements(movs, root);

    if (this.tail != null) {
        var m = new Movement;
        m.tail = this;
        m.head = root.find_head(this.tail);
        movs.push(m);
    }
};

/* Find the greatest y-position in the tree, to measure its entire height */
Node.prototype.find_height = function() {
    this.max_y = this.y;

    if (this.features)
        this.max_y += this.features_el.getBBox().height + Tree.node_text_separation;

    for (var child = this.first; child != null; child = child.next)
        this.max_y = Math.max(this.max_y, child.find_height());
    return this.max_y;
};

Node.prototype.draw = function() {
    this.text = App.R.text(0, 0, this.value);

    this.text.attr({
        'font-size': Tree.font_size,
    });
    if (this.features) {
        this.features_el = App.R.text(
            0, 
            this.text.getBBox().height + Tree.node_text_separation, 
            this.features
        );
        this.features_el.attr({
            'font-size': Tree.font_size,
            'font-style': 'italic',
        });
    }
};

/* Traverse the tree post-order, set the space on each side of a node */
Node.prototype.set_width = function() {
    this.draw();
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

Node.prototype.reset_chains = function() {
    this.head_chain = null;
    this.tail_chain = null;

    for (var child = this.first; child != null; child = child.next)
        child.reset_chains();
};

/* Jumps branches to the right or left searching for the head or tail chain
 * to get the y value. If it's not there, goes one level up in the tree */
Node.prototype.find_intervening_height = function(leftwards) {
    var y = this.y,
        n = this;

    /* Search for the tail or head chain in this depth of the tree */
    while (true) {
        n = (leftwards) ? n.previous : n.next;
        if (!n) break;
        if ((n.head_chain) || (n.tail_chain)) return y;
        y = Math.max(y, n.max_y);
    }

    /* The tail wasn't in this level, go one level up */
    y = Math.max(y, this.parent.find_intervening_height(leftwards));
    return y;
};

Node.prototype.do_strikeout = function() {
    for (var child = this.first; child != null; child = child.next)
        child.do_strikeout();

    if (this.strikeout) {
        var from = 'M' + (this.x - this.text.getBBox().width/2) + ',' + this.y;
        var to = 'H' + (this.x + this.text.getBBox().width/2);
        App.R.path(from + to);
    }
};

function Movement() {
    this.head = null;
    this.tail = null;
    this.should_draw = null;
    this.lca = null;
    this.dest_x = null;
    this.dest_y = null;
    this.bottom_y = null;
    this.max_y = null;
    this.leftwards = null;
};

Movement.prototype.set_up = function() {
    this.should_draw = 0;
    if ((this.tail == null) || (this.head == null)) return;

    /* Check that head is parent of tail */
    if (this.head_is_ancestor()) return;

    /* Find the least common ancestor */
    this.find_lca();
    if (this.lca == null) return;

    this.find_intervening_height();

    this.dest_x = this.head.x;
    /* Draw to the bottom of the head branch */
    this.dest_y = this.head.max_y + (this.head.text.getBBox().height/2) + Tree.padding_bottom; 

    this.bottom_y = this.max_y + Tree.movement_bottom;
    this.should_draw = true;
    return;
};

/* Goes up from the tail to check if the head is its ancestor.
 * Builds the tail chain on the process. */
Movement.prototype.head_is_ancestor = function() {
    var n = this.tail;
    n.tail_chain = 1;
    while (n.parent != null) {
        n = n.parent;
        if (n == this.head) return true;
        n.tail_chain = 1;
    }
    return false;
};

/* Goes up the tree from the *head* until it hits tail chain. 
 * When it does, that's the least common ancestor.
 * Builds the head chain on the process */
Movement.prototype.find_lca = function() {
    var n = this.head;
    n.head_chain = 1;
    this.lca = null;
    while (n.parent != null) {
        n = n.parent;
        n.head_chain = 1;
        if (n.tail_chain) {
            this.lca = n;
            break;
        }
    }
};

/* Check the direction the movement arrow is going and find the greatest
 * y value involved in the movement. */
Movement.prototype.find_intervening_height = function() {
    /* The first chain from the lca defines the direction of the movement */
    for (var child = this.lca.first; child != null; child = child.next) {
        if ((child.head_chain) || (child.tail_chain)) {
            this.leftwards = false;
            if (child.head_chain) this.leftwards = true;
            break;
        }
    }

    this.max_y = Math.max(this.tail.find_intervening_height(this.leftwards),
                          this.head.find_intervening_height(!this.leftwards),
                          this.head.max_y);
};

Movement.prototype.draw = function() {
    var R = App.R;

    var tail_x = this.tail.x;
    /* Draw the curve in two steps */
    var from = 'M' + tail_x + ',' + this.tail.bottom_y();
    var to1 = 'Q' + tail_x + ',' + this.bottom_y + ',' +
              ((tail_x + this.dest_x) / 2) + ',' + this.bottom_y;
    var to2 = this.dest_x + ',' + this.bottom_y + ',' +
              this.dest_x + ',' + this.dest_y;
    R.path(from + to1 + to2);

    /* Draw the arrow */
    var from = 'M' + this.dest_x + ',' + this.dest_y;
    var to3 = 'L' + (this.dest_x + 3) + ',' + (this.dest_y + 10);
    var to4 = 'H' + (this.dest_x - 3);
    var to5 = from.replace(/M/, 'L');
    R.path(from + to3 + to4 + to5).attr({fill: 'black'});
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
    t.do_strikeout();
    t.find_height();
    
    var movement_lines = new Array();
    t.find_movements(movement_lines, t);
    for (var i = 0; i < movement_lines.length; i++) {
        t.reset_chains();
        movement_lines[i].set_up();
    }

    t.draw_tree_lines();
    for (var i = 0; i < movement_lines.length; i++) {
        if (movement_lines[i].should_draw)
            movement_lines[i].draw();
    }

    /* Move the entire tree */
    var set = R.setFinish();
    set.translate(t.left_width + Tree.h_space, Tree.v_space);

    /* Control the paper size taking into account the movement lines */
    var height = t.max_y + (2*Tree.v_space);
    for (var i = 0; i < movement_lines.length; i++)
        if (movement_lines[i].max_y == t.max_y) {
            height += Tree.v_space;
            break;
        }

    /* Resize the paper so it can show the entire tree */
    R.setSize(t.left_width + (2*Tree.h_space) + t.right_width, height);
    return t;
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
