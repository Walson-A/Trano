import QtQuick 2.15

// Decorative shapes only: no invented titles, no focus, no continuous GPU work.
Item {
    id:skeleton
    objectName:'loadingSkeleton'
    property bool active:false
    property string layout:'catalog'
    property int columns:6
    property color ink:'#242731'
    property bool shown:false
    visible:active && shown
    enabled:false
    clip:true
    Accessible.ignored:true
    onActiveChanged:{shown=false;if(active)delay.restart();else delay.stop();}
    Component.onCompleted:if(active)delay.restart()
    Timer {id:delay;interval:160;onTriggered:skeleton.shown=true}
    Loader {anchors.fill:parent;active:skeleton.visible;sourceComponent:shapes}
    Component {id:shapes;Item {width:skeleton.width;height:skeleton.height
    Repeater {model:skeleton.layout==='catalog' ? skeleton.columns*2 : 0
        Item {x:index%skeleton.columns*skeleton.width/skeleton.columns+12;y:Math.floor(index/skeleton.columns)*310+7;width:skeleton.width/skeleton.columns-20;height:292
            Rectangle {width:parent.width;height:242;radius:9;color:skeleton.ink}
            Rectangle {y:256;width:parent.width*.86;height:13;radius:4;color:skeleton.ink}
            Rectangle {y:277;width:parent.width*.58;height:11;radius:4;color:skeleton.ink}
        }
    }
    Repeater {model:skeleton.layout==='episodes' ? 3 : 0
        Item {x:index*386+6;y:12;width:350;height:218
            Rectangle {width:parent.width;height:197;radius:12;color:skeleton.ink}
            Rectangle {y:207;width:parent.width*.62;height:12;radius:4;color:skeleton.ink}
        }
    }
    Repeater {model:skeleton.layout==='episode-menu' ? 4 : 0
        Item {x:index*274;y:4;width:258;height:230
            Rectangle {width:258;height:146;radius:8;color:skeleton.ink}
            Rectangle {y:157;width:124;height:12;radius:4;color:skeleton.ink}
            Rectangle {y:183;width:226;height:13;radius:4;color:skeleton.ink}
        }
    }
    Repeater {model:skeleton.layout==='text' ? 2 : 0
        Rectangle {y:index*27;width:skeleton.width*(index===0 ? 1 : .78);height:14;radius:4;color:skeleton.ink}
    }
    Rectangle {anchors.fill:parent;radius:9;color:skeleton.ink;visible:skeleton.layout==='cover'}
    Item {anchors.fill:parent;visible:skeleton.layout==='followup'
        Repeater {model:skeleton.layout==='followup' ? 6 : 0;Rectangle {x:index%2*317;y:Math.floor(index/2)*60;width:307;height:50;radius:9;color:skeleton.ink}}
        Rectangle {y:226;width:parent.width;height:80;radius:12;color:skeleton.ink}
    }
    Item {anchors.fill:parent;visible:skeleton.layout==='home'
        Rectangle {width:parent.width*.54;height:38;radius:8;color:skeleton.ink}
        Rectangle {y:62;width:parent.width*.42;height:18;radius:5;color:skeleton.ink}
        Rectangle {y:94;width:parent.width*.6;height:18;radius:5;color:skeleton.ink}
        Rectangle {y:154;width:280;height:54;radius:10;color:skeleton.ink}
        Repeater {model:skeleton.layout==='home' ? 5 : 0;Rectangle {x:index*(skeleton.width+18)/5;y:286;width:(skeleton.width-72)/5;height:142;radius:11;color:skeleton.ink}}
    }
    Item {anchors.fill:parent;visible:skeleton.layout==='profile'
        Repeater {model:skeleton.layout==='profile' ? 4 : 0;Rectangle {x:index*(skeleton.width+16)/4;width:(skeleton.width-48)/4;height:112;radius:16;color:skeleton.ink}}
        Repeater {model:skeleton.layout==='profile' ? 4 : 0;Rectangle {x:index*(skeleton.width+20)/4;y:194;width:(skeleton.width-60)/4;height:142;radius:11;color:skeleton.ink}}
    }
    Repeater {model:skeleton.layout==='options' ? 3 : 0
        Rectangle {x:16;y:index*58+12;width:skeleton.width-32;height:42;radius:7;color:skeleton.ink}
    }
    }}
}
