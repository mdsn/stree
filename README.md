stree
=====

Syntax tree drawing app for linguists. Renders in SVG using RaphaelJS.

Most of the current code is adapted/taken from [mshang's syntree](https://github.com/mshang/syntree) project to make it render in SVG, so pay him a visit and say thanks if you like.

Although most basic (and correct) inputs should work, movement lines are currently not implemented, as are not a few other things I decided to add (features, element strikeout).

The idea is to build an UI around this parsing and rendering core so people don't have to deal with the square bracket notation, which gets messy after indenting a couple of levels.

