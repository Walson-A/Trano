import QtQuick 2.15
import QtGraphicalEffects 1.0

Item {
    id:nav
    width:1280;height:98
    property string family:'sans-serif'
    property string page:'home'
    property bool focused:false
    property int selectedIndex:0
    property string pseudo:'Profil'
    property string avatar:''
    property bool reducedMotion:false
    signal destinationRequested(string destination)
    function step(index,delta){var order=[2,0,1];return order[Math.max(0,Math.min(2,order.indexOf(index)+delta))];}
    Rectangle {anchors.fill:parent;gradient:Gradient {GradientStop {position:0;color:'#d9090a0d'} GradientStop {position:1;color:'#00090a0d'}}}
    Row {x:64;y:24;spacing:12
        HeroButton {objectName:'homeEntry';width:140;flat:true;label:'Accueil';family:nav.family;reducedMotion:nav.reducedMotion;focused:nav.focused && nav.selectedIndex===2;onActivated:nav.destinationRequested('home')
            Rectangle {x:44;y:48;width:52;height:3;radius:1.5;color:parent.focused ? '#15171c' : 'white';visible:nav.page==='home'}
        }
        HeroButton {objectName:'searchEntry';width:180;flat:true;iconKey:'search';label:'Recherche';family:nav.family;reducedMotion:nav.reducedMotion;focused:nav.focused && nav.selectedIndex===0;onActivated:nav.destinationRequested('search')
            Rectangle {x:58;y:48;width:92;height:3;radius:1.5;color:parent.focused ? '#15171c' : 'white';visible:nav.page==='search'}
        }
    }
    Item {id:profile;objectName:'profileEntry';x:1216-width;y:24;width:Math.max(130,Math.min(260,name.implicitWidth+78));height:52
        property bool targeted:nav.focused && nav.selectedIndex===1
        Accessible.role:Accessible.Button;Accessible.name:'Profil'
        Rectangle {anchors.fill:parent;radius:12;color:profile.targeted ? '#f6f6f7' : '#7513161c';border.color:profile.targeted ? 'white' : '#30ffffff'}
        Text {id:name;x:18;width:parent.width-78;anchors.verticalCenter:parent.verticalCenter;text:nav.pseudo || 'Profil';textFormat:Text.PlainText;elide:Text.ElideRight;color:profile.targeted ? '#121316' : 'white';font.family:nav.family;font.pixelSize:19;font.weight:Font.DemiBold}
        Rectangle {x:18;y:47;width:parent.width-36;height:3;radius:1.5;color:profile.targeted ? '#15171c' : 'white';visible:nav.page==='profile'}
        Rectangle {x:parent.width-50;y:6;width:40;height:40;radius:20;color:'#b32c3039'
            Image {id:picture;anchors.fill:parent;anchors.margins:2;source:nav.avatar;sourceSize.width:80;fillMode:Image.PreserveAspectCrop;asynchronous:true;visible:false}
            OpacityMask {anchors.fill:picture;source:picture;maskSource:Rectangle {width:36;height:36;radius:18}}
            Icon {anchors.centerIn:parent;width:22;height:22;name:'user-round';visible:picture.status!==Image.Ready}
        }
        MouseArea {anchors.fill:parent;onClicked:nav.destinationRequested('profile')}
    }
}
