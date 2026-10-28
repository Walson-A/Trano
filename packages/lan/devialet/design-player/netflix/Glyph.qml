import QtQuick 2.15
import QtGraphicalEffects 1.0
Item {
    id:glyph
    property string name:'play'
    property color ink:'white'
    width:28;height:28
    Image {id:pixels;anchors.fill:parent;source:Qt.resolvedUrl('icons/'+glyph.name+'.png');sourceSize:Qt.size(96,96);visible:false}
    ColorOverlay {anchors.fill:parent;source:pixels;color:glyph.ink}
}
