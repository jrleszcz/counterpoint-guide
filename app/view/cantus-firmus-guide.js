var d3 = require('d3')
var CFguide = require('../model/cantus-firmus-maker.js')
var Pitch = require('nmusic').Pitch
var sortPitches = require('nmusic').sortPitches

/**
 * Takes a D3 selection into which the interactive guide will be inserted.
 */
var cantusFirmusGuide = function (container) {

  // create initial CF guide with attributes or defaults
  var cf = new CFguide(container.attr('first-note') || 'C4',
                       container.attr('mode')       || 'major',
                       container.attr('max-range')  || 10,
                       container.attr('max-length') || 16)

  // set intial width to 100% to get actual width
  var svg = container.append('svg')
                .attr('width', '100%')

  var margin               = {top: 20, right: 20, bottom: 20, left: 10},

      // svg dimensions
      totalWidth           = container.node().offsetWidth,             // set to 100% possible
      totalHeight          = container.attr('height') || 450,
      width                = totalWidth - margin.left - margin.right,
      height               = totalHeight - margin.top - margin.bottom,

      // line connecting construction
      pathWidth            = 1,           // width of construction line
      pathColor            = 'steelblue', // color of path
      choicePadding        = 0.16,        // reserve 16% of vertical space for padding on choices

      // note boxes
      unfinishedNoteColor  = '#c6dbef',   // light blue
      finishedNoteColor    = '#2ca02c',   // green
      choiceOpacity        = 0.25,        // opacity of choice notes
      constructionOpacity  = 0.5,         // opacity of construction notes
      onClickNoteOpacity   = 1,           // on click opacity
      onClickSize          = 1.2,         // increase size to 120%
      sizeBeforeSelect     = 1.6,         // increase size to 160%

      // note text on y axis
      yAxisWidth           = 44,          // space reserved for note names on y axis
      fontSize             = '1.3em',     // default font size
      highlightedFontSize  = '2.2em',     // font size when note is selected

      // animation speeds
      animationTime        = 300,         // animation time to re-scale
      choiceAnimationTime  = 500          // animation time for choices to appear

  var touchDetected        = false        // has the SVG received a touchevent? if so, disable mousover

  // set svg dimensions
  svg.attr('width', totalWidth)
  svg.attr('height', totalHeight)

  svg = svg.append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
            .on('touchstart', function () {
              touchDetected = true
              d3.select(this).on('touchstart', null) // remove this listener after touch
            })

  // append path, note containers, and y axis container
  svg.append('path')
      .attr('id', 'construction-line')
      .attr('stroke-width', pathWidth)
      .attr('stroke-linecap', 'round')
      .attr('stroke', pathColor)
  svg.append('g')
      .attr('class', 'construction-notes')
  svg.append('g')
      .attr('class', 'y-axis-text')
  svg.append('g')
      .attr('class', 'choice-notes')

  // declare scales and line
  var x                = d3.scale.ordinal()
                             .domain(d3.range(d3.max([8, cf.length() + 1])))
                             .rangeRoundBands([yAxisWidth, width])
  var y                = d3.scale.ordinal()
                             .domain(cf.domain())
                             .rangeRoundBands([height, 0])
  var constructionLine = d3.svg.line()
                             .x(function (d, i) { return x(i) + x.rangeBand() / 2})
                             .y(function (d) { return y(d) + y.rangeBand() / 2 })
                             .interpolate('cardinal')
                             .tension(0.7)

  // how much to pad choice boxes
  var choiceBoxYPadding = function () { return y.rangeBand() * choicePadding }

  window.addEventListener('resize', function () {
    var oldWidth = width
    container.select('svg')
        .attr('width', '100%')                                          // set to 100% to get the new width
    width = container.node().offsetWidth - margin.left - margin.right   // reset global width variable
    container.select('svg')
        .attr('width', width + margin.left + margin.right)              // reset whole svg width with new width
    if (oldWidth !== width) {                                           // only if width changed:
      x.rangeRoundBands([yAxisWidth, width])                            // reset x scale range
      redraw()                                                          // redraw
    }
  })

  // clear delete timeout and reset note size and opacity
  function constructionMouseUp (d, i) {
    if (d3.select(this).attr('selected') === 'true') {
      var index = i      // capture index for using in x scales below
      resetYTextSize(d)  // un-highlight y-axis note name
      d3.select(this)
          .transition()
          .duration(250)
          .attr('fill-opacity', constructionOpacity)
          .attr('x', x(index))
          .attr('y', function (d) { return y(d) })
          .attr('width', x.rangeBand())
          .attr('height', y.rangeBand())
          .each('end', function () {
            d3.select(this)
                .attr('animating', 'no')
          })
    }
  }

  // this function will play the note
  function playNote (note) {
    console.log('Played:', note)
  }

  function highlightYtext(note) {
    svg.select('.y-axis-text').selectAll('text')
        .filter(function (d) { return d.val === note })
        .transition()
        .duration(50)
        .attr('font-size', highlightedFontSize)
  }

  function resetYTextSize(note) {
    svg.select('.y-axis-text').selectAll('text')
        .filter(function (d) { return d.val === note })
        .transition()
        .duration(250)
        .attr('font-size', fontSize)
  }

  function growNoteOnTap(transition, xIndex, note) {
    transition
        .attr('fill-opacity', onClickNoteOpacity)
        .attr('x', x(xIndex) - (x.rangeBand() * onClickSize - x.rangeBand()) / 2)
        .attr('y', y(note) - (y.rangeBand() * onClickSize - y.rangeBand()) / 2)
        .attr('width', x.rangeBand() * onClickSize)
        .attr('height', y.rangeBand() * onClickSize)
  }

  function growBeforeSelect(transition, xIndex, note) {
    transition
        .attr('x', x(xIndex) - (x.rangeBand() * sizeBeforeSelect - x.rangeBand()) / 2)
        .attr('y', y(note) - (y.rangeBand() * sizeBeforeSelect - y.rangeBand()) / 2)
        .attr('width', x.rangeBand() * sizeBeforeSelect)
        .attr('height', y.rangeBand() * sizeBeforeSelect)
  }

  // play note, highlight note, and delete if held
  function constructionMouseDown (d, i) {
    d3.event.preventDefault()   // prevent default selection
    var xIndex = i              // capture index for using in x scales below
    var note = d

    playNote(note)                 // play the note
    highlightYtext(note)           // highlight y axis text
    if (d3.select(this).attr('animating') === 'no') {
      d3.select(this)
          // 1. highlight and grow
          .attr('selected', 'true')
          .transition()
          .duration(50)
          .call(growNoteOnTap, xIndex, note)
          // 2. delay for a moment
          .transition()
          .delay(200)
          // 3. rapidly grow in preparation for delete
          .transition()
          .duration(200)
          .call(growBeforeSelect, xIndex, note)
          // 4. delete up to this point and redraw
          .each('end', function () {
            d3.select(this)
                .attr('selected', 'false')
            // prevent calling delete multiple times at once on multi-touch
            if (d3.select(this).attr('animating') === 'no') {
              deleteToHere (xIndex)
            }
          })
    }
  }

  // delete all construction notes up to this index point (not inclusive)
  function deleteToHere (index) {
    // set construction points to animating
    svg.select('.construction-notes').selectAll('rect')
        .attr('animating', 'yes')
        .attr('selected', 'false')
    // disable choice mouse events
    svg.select('.choice-notes').selectAll('rect')
        .on('mouseover', null)
        .on('mousedown', null)
        .on('touchstart', null)
        .on('mouseup', null)
        .on('touchend', null)
    // pop until
    d3.range(cf.length() - 1 - index).forEach(function () {
      cf.pop()
    })
    redraw(svg)
  }

  function constructionNotes (transition) {
    transition
        .attr('x', function (d, i) { return x(i) })
        .attr('y', function (d) { return y(d) })
        .attr('width', x.rangeBand())
        .attr('height', y.rangeBand())
        .attr('rx', 7)
        .attr('ry', 7)
        .attr('fill-opacity', constructionOpacity)
        .attr('fill', function () { return cf.isValid() ? finishedNoteColor : unfinishedNoteColor })
  }

  // collapse choices into chosen note which is now cf.lastNote()
  function choiceCollapse (transition) {
    transition
        .attr('x', x(cf.length() - 1))
        .attr('y', y(cf.lastNote()))
        .attr('width', x.rangeBand())
        .attr('height', y.rangeBand())
        .attr('fill-opacity', 0)
  }

  // choices enter behind last note of the same pitch
  // if the pitch has not been used before, grow from size 0 and slide in from x=0
  function choiceEnterPosition (selection) {
    selection
        .attr('x', function (d) {
          var lastIndex = cf.construction().lastIndexOf(d.val)
          return (lastIndex === -1) ? yAxisWidth : x(lastIndex)
        })
        .attr('y', function (d) {
          return (cf.construction().lastIndexOf(d.val) === -1) ? y(d.val) + y.rangeBand() / 2
                                                               : y(d.val)
        })
        .attr('width', function (d) {
          return (cf.construction().lastIndexOf(d.val) === -1) ? 0 : x.rangeBand()
        })
        .attr('height', function (d) {
          return (cf.construction().lastIndexOf(d.val) === -1) ? 0 : y.rangeBand()
        })
        .attr('fill-opacity', 0)
        .attr('rx', 7)
        .attr('ry', 7)
        .attr('animating', 'yes') // set to 'no' when finished moving
  }

  function choiceActivePosition (selection) {
    selection
        .attr('x', x(cf.length()))
        .attr('y', function (d) { return y(d.val) + choiceBoxYPadding() / 2 })
        .attr('width', x.rangeBand())
        .attr('height', y.rangeBand() - choiceBoxYPadding())
        .attr('fill-opacity', choiceOpacity)
  }

  // apply listeners to choice notes after animation has finished
  function applyChoiceListeners (selection) {
    selection
        .attr('animating', 'no')
        .on('mouseover', function (d) {
          // only do this if no touch has been detected.
          // looks great with a mouse, is confusing on a touchscreen
          if (!touchDetected) {
            var selectedNote = d.val
            // move construction line onto this choice
            svg.select('#construction-line')
                .datum(cf.construction().concat(selectedNote))
                .transition()
                .duration(300)
                .attr('d', constructionLine)
          }
        })
        .on('mousedown', choiceMouseDown)
        .on('touchstart', choiceMouseDown)
        .on('mouseup', choiceMouseUp)
        .on('touchend', choiceMouseUp)
  }

  // play note, highlight note, and delete if held
  function choiceMouseDown (d, i) {
    d3.event.preventDefault()   // prevent default selection
    var xIndex = cf.length()    // index for use in x scales below
    var note = d.val
    playNote(note)                 // play the note
    highlightYtext(note)           // highlight y axis text
    if (d3.select(this).attr('animating') === 'no') {
      d3.select(this)
          // 1. highlight and grow
          .attr('selected', 'true')
          .transition()
          .duration(50)
          .call(growNoteOnTap, xIndex, note)
          // 2. delay for a moment
          .transition()
          .delay(200)
          // 3. rapidly grow in preparation for delete
          .transition()
          .duration(200)
          .call(growBeforeSelect, xIndex, note)
          // 4. delete up to this point and redraw
          .each('end', function () {
            d3.select(this)
                .attr('selected', 'false')
            // prevent selecting multiple choices at once on multi-touch
            if (d3.select(this).attr('animating') === 'no') {
              // remove event listeners from all note choices
              svg.select('.choice-notes').selectAll('rect')
                  .on('mouseover', null)
                  .on('mousedown', null)
                  .on('touchstart', null)
                  .on('mouseup', null)
                  .on('touchend', null)
              cf.addNote(d.val)
              redraw(svg)
            }
          })
    }
  }

  // clear delete timeout and reset note size and opacity
  function choiceMouseUp (d, i) {
    var xIndex = cf.length()    // index for use in x scales below
    var note = d.val
    if (d3.select(this).attr('selected') === 'true') {
      resetYTextSize(note)  // un-highlight y-axis note name
      d3.select(this)
          .transition()
          .duration(250)
          .call(choiceActivePosition)
          .each('end', function () {
            d3.select(this)
                .attr('animating', 'no')
          })
    }
  }

  function enteringConstructionNotes (selection) {
    selection
        .attr('x', function (d, i) { return x(i) })
        .attr('y', function (d) { return y(d) + choiceBoxYPadding() / 2 })
        .attr('width', x.rangeBand())
        .attr('height', y.rangeBand() - choiceBoxYPadding())
        .attr('rx', 7)
        .attr('ry', 7)
        .attr('fill', unfinishedNoteColor)
  }

  function exitingConstructionNotes (transition) {
    transition
        .attr('x', x(cf.length() - 1))
        .attr('y', y(cf.lastNote()))
        .attr('width', x.rangeBand())
        .attr('height', y.rangeBand())
        .attr('fill', function () { return cf.isValid() ? finishedNoteColor : unfinishedNoteColor })
  }

  // takes a reference to the choiceNotes group
  function appendChoices () {
  // add points of choices
    var choices = svg.select('.choice-notes').selectAll('rect')
        .data(cf.choices().map(function (sciPitch) {
              return {val: sciPitch}
            }), function (d) { return d.val })

    // 1. exit
    choices.exit()
        .attr('animating', 'yes')
      .transition()
        .duration(animationTime)
        .call(choiceCollapse)            // a. collapse into chosen note
        .remove()                        // b. remove

    // 2. update
    choices
        .attr('animating', 'yes')
      .transition()
        .duration(animationTime)
        .call(choiceCollapse)            // a. collapse into chosen note with exit notes
        .each('end', function () {       // b. switch position to left
          d3.select(this)
              .call(choiceEnterPosition)
        })

    choices
        .attr('animating', 'yes')
      .transition()                  // c. move to active position
        .delay(function (d) {
          return animationTime + Pitch(d.val).intervalSize(cf.lastNote()) * choiceAnimationTime / 6
        })
        .duration(choiceAnimationTime)
        .call(choiceActivePosition)
        .each('end', function () {
          d3.select(this)
              .call(applyChoiceListeners) // d. activate listeners
        })

    // 3. enter
    choices.enter()
      .append('rect')
        .call(choiceEnterPosition)        // a. create rect at initial position
      .transition()
        .delay(function (d) {
          return animationTime + Pitch(d.val).intervalSize(cf.lastNote()) * choiceAnimationTime / 6
        })
        .duration(choiceAnimationTime)
        .call(choiceActivePosition)       // b. switch to active position
        .each('end', function () {
          d3.select(this)
              .call(applyChoiceListeners) // c. activate listeners
        })
  }

  function redraw () {
    // unselect all notes to prevent any touch-end or mouse-off events
    svg.select('.construction-notes').selectAll('rect')
        .attr('selected', 'false')
    svg.select('.choice-notes').selectAll('rect')
        .attr('selected', 'false')

    // before updating scales, use old scale to new point and extend path
    // create note in choice position for animation
    var constructionPoints = svg.select('.construction-notes').selectAll('rect')
        .data(cf.construction())

    var chosenLine = svg.select('#construction-line')
        .datum(cf.construction())
        .attr('d', constructionLine)

    // add new note disguised as choice note, transition to construction note
    constructionPoints.enter().append('rect')
        .call(enteringConstructionNotes)
        .on('mousedown', constructionMouseDown)
        .on('touchstart', constructionMouseDown)
        .on('mouseup', constructionMouseUp)
        .on('touchend', constructionMouseUp)


    // update scale domains
    y.domain(cf.domain())
    x.domain(d3.range(d3.max([8, cf.length() + 1])))

    // remove unused construction points
    constructionPoints.exit()
        .transition()
        .duration(animationTime)
        .call(exitingConstructionNotes)
        .remove()

    // move construction to new position using updated scales
    constructionPoints.transition()
        .duration(animationTime)
        .call(constructionNotes)
        .each('end', function () {
          d3.select(this)
              .attr('animating', 'no')
        })

    // update construction line with new scales
    chosenLine.transition()
        .duration(animationTime)
        .attr('d', constructionLine)

    // recalculate y axis text
    var yText = svg.select('.y-axis-text').selectAll('text')
        .data(cf.domain().map(function (sciPitch) {
          return { val: sciPitch }
        }), function (d) { return d.val })
    // remove unused notes in domain
    yText.exit()
        .transition()
        .delay(function (d) {
          var thisNote = Pitch(d.val)
          // notes closer to current range exit first to get out of the way
          return (Math.min(thisNote.intervalSize(cf.highNote()),
                          thisNote.intervalSize(cf.lowNote())) - 2) * animationTime / 10
        })
        .duration(animationTime/3)
        .attr('x', -50)
        .remove()
    // update remaining
    yText.transition()
        .duration(animationTime)
        .text(function (d) { return Pitch(d.val).pitchClass() })
        .attr('x', 0)
        .attr('y', function (d) { return y(d.val) + y.rangeBand() / 2 })
        .attr('font-size', fontSize)
    yText.enter()
        .append('text')
        .text(function (d) { return Pitch(d.val).pitchClass() })
        .attr('font-size', fontSize)
        .attr('text-anchor', 'start')
        .attr('dominant-baseline', 'central')
        .attr('x', -50)
        .attr('y', function (d) { return y(d.val) + y.rangeBand() / 2 })
        .transition()
        .delay(function (d) { // try to match incoming choice notes
          return animationTime + (Pitch(d.val).intervalSize(cf.lastNote()) * choiceAnimationTime / 6)
        })
        .duration(choiceAnimationTime)
        .attr('x', 0)

    appendChoices()
  }
  redraw() // initialize
}

d3.selectAll('counterpoint')
  .each(function () { cantusFirmusGuide(d3.select(this)) })
