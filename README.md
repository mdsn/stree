stree
=====

Syntax tree drawing app for linguists. Renders in SVG using RaphaelJS, so technically you should be able to get a tree in whatever size you need it.

Most of the code is adapted/taken from [mshang's syntree](https://github.com/mshang/syntree) project to make it render in SVG, so pay him a visit and say thanks if you like.

Currently implemented features are:
* Movement lines
* Features
* Element strikeout

![Screenshot](https://raw.github.com/mdsn/stree/master/eg2.png "Example")

The idea is to build an UI around this parsing and rendering core so people don't have to deal with the square bracket notation, which gets messy after indenting a couple of levels.

