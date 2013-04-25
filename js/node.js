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

    /* TODO: Move all raphael objects inside some form of container */
    this.strikeout = false;
    this.strikeout_element = null;
    this.text = null; /* Raphael text element */
    this.features_el = null;
    this.value = null;
    this.features = null;
    this.box = null;
};

/* Get the y coordinate over this node */
Node.prototype.top_y = function() {
    return Math.floor(this.y - (this.text.getBBox().height / 2) - Tree.padding_top) + 0.5;
};

/* Get the y coordinate under this node */
Node.prototype.bottom_y = function() {
    var y = Math.floor(this.y + (this.text.getBBox().height / 2) + Tree.padding_bottom) + 0.5;
    if (this.features)
        y += this.features_el.getBBox().height;
    return y;
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
Node.prototype.draw_tree_lines = function(treeSet) {
    for (var child = this.first; child != null; child = child.next)
        child.draw_tree_lines(treeSet);

    /* Do nothing for the root node */
    if (!this.parent) return;

    if (this.draw_triangle) {
        var from = 'M' + this.parent.x + ',' + this.parent.bottom_y();
        var to1 = 'L' + (this.x - this.left_width) + ',' + this.top_y();
        var to2 = 'L' + (this.x + this.right_width) + ',' + this.top_y();
        var to3 = from.replace(/M/, 'L');
        treeSet.push(App.R.path(from + to1 + to2 + to3));
        return;
    }

    /* Regular line to the parent */
    var from = 'M' + this.parent.x + ',' + this.parent.bottom_y();
    var to = 'L' + this.x + ',' + this.top_y();
    treeSet.push(App.R.path(from + to));
};

/* Traverse the tree post-order, set the location of each children according to
 * the step value found in set_width */
Node.prototype.assign_location = function(x, y) {
    this.x = Math.floor(x) + 0.5;
    this.y = Math.floor(y) + 0.5;

    this.elements.transform(['T' + x + ',' + y]);

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

/* Redraw an existing node with updated information */
Node.prototype.redraw = function() {
    this.text.attr('text', this.value);

    if (this.features)
        this.features_el.attr('text', '[' + this.features + ']');

    if ((!this.strikeout) && (this.strikeout_element)) {
        this.strikeout_element.remove();
        this.strikeout_element = null;
    }
    else if (this.strikeout) {
        this.do_strikeout(false);
        this.strikeout_element.translate(App.tree.left_width + Tree.h_margin, Tree.v_margin);
    }

    if (this.box) {
        var b = this.elements.getBBox();
        this.box.attr({
            x: floorPt5(b.x),
            y: floorPt5(b.y),
            width: b.width,
            height: b.height,
        });
    }
}

Node.prototype.draw = function(treeSet) {
    this.elements = App.R.set();
    this.text = App.R.text(0, 0, this.value);

    this.text.attr({
        'font-size': Tree.font_size,
    });
    if (this.features) {
        this.features_el = App.R.text(
            0, 
            this.text.getBBox().height + Tree.node_text_separation, 
            '[' + this.features + ']'
        );
        this.features_el.attr({
            'font-size': Tree.font_size,
            'font-style': 'italic',
        });
        this.elements.push(this.features_el);
    }
    this.elements.push(this.text);
    Tree.bindEvents(this);
    treeSet.push(this.elements);

    for (var child = this.first; child != null; child = child.next)
        child.draw(treeSet);
};

/* Traverse the tree post-order, set the space on each side of a node */
Node.prototype.set_width = function() {
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

    if (this.features)
        y += this.features_el.getBBox().height;

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

Node.prototype.do_strikeout = function(recurse) {
    if (recurse) {
        for (var child = this.first; child != null; child = child.next)
            child.do_strikeout(recurse);
    }

    if (this.strikeout) {
        var from = 'M' + (this.x - this.text.getBBox().width/2) + ',' + this.y;
        var to = 'H' + (this.x + this.text.getBBox().width/2);
        this.strikeout_element = App.R.path(from + to);
        this.elements.push(this.strikeout_element);
    }
};
