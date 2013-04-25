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

Movement.prototype.draw = function(treeSet) {
    var R = App.R;

    var tail_x = this.tail.x;
    /* Draw the curve in two steps */
    var from = 'M' + tail_x + ',' + this.tail.bottom_y();
    var to1 = 'Q' + tail_x + ',' + this.bottom_y + ',' +
              ((tail_x + this.dest_x) / 2) + ',' + this.bottom_y;
    var to2 = this.dest_x + ',' + this.bottom_y + ',' +
              this.dest_x + ',' + this.dest_y;
    treeSet.push(R.path(from + to1 + to2));

    /* Draw the arrow */
    var from = 'M' + this.dest_x + ',' + this.dest_y;
    var to3 = 'L' + (this.dest_x + 3) + ',' + (this.dest_y + 10);
    var to4 = 'H' + (this.dest_x - 3);
    var to5 = from.replace(/M/, 'L');
    treeSet.push(R.path(from + to3 + to4 + to5).attr({fill: 'black'}));
};
