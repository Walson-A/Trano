"""Removal consent and uncertain receipts, real QML with explicit fake account only."""
import json


def run(window, session, screen, details, calls, QTest, Qt, QObject, spin, evidence):
    def data(obj, name):
        value=obj.property(name)
        return value.toVariant() if hasattr(value,'toVariant') else value
    def removals():return [b for p,b in calls if p=='/tv/v1/library-remove']
    def reads():return [b for p,b in calls if p=='/tv/v1/library-entry']
    present={'anilist_id':154587,'presence':'present','revision':'fresh','editable':True,'moi':{'statut':'CURRENT','note':7.2,'progression':5}}
    session.setProperty('libraryEnabled',True);session.setProperty('libraryRemoveEnabled',True)
    session.setProperty('delayLibrary',False);session.setProperty('delayDetails',False)
    screen.openDetail(details['154587']['carte'])
    detail=window.findChild(QObject,'atlasDetail');store=window.findChild(QObject,'detailLibrary')
    editor=window.findChild(QObject,'libraryEditor')
    def seed():
        session.seedLibraryJson(154587,json.dumps(present));store.load(154587)
        spin(lambda:store.phase(154587)=='ready')
    def open_editor():
        detail.personalAction(True);spin(lambda:editor.property('editable'))
    seed();open_editor()
    QTest.qWait(120);assert window.grabWindow().save(str(evidence/'remove-entry.png'))
    before=len(removals())
    session.setProperty('libraryRemoveEnabled',False)
    assert not editor.property('removalVisible') and not store.remove(154587) and len(removals())==before
    session.setProperty('libraryRemoveEnabled',True)
    # Opening/Back/Cancel and focus alone never delete an entry.
    editor.setProperty('statusIndex',0);editor.setProperty('zone','status')
    QTest.keyClick(window,Qt.Key_Up)
    assert editor.property('zone')=='remove'
    QTest.keyClick(window,Qt.Key_Return)
    assert editor.property('removeOpen') and editor.property('removeChoice')==0
    assert window.grabWindow().save(str(evidence/'remove-confirmation.png'))
    QTest.keyClick(window,Qt.Key_Back)
    assert not editor.property('removeOpen') and editor.property('opened') and len(removals())==before
    editor.askRemoval();QTest.keyClick(window,Qt.Key_Return)
    assert not editor.property('removeOpen') and len(removals())==before
    # A confirmed removal uses the opaque removal revision, never a note/status patch or entry ID.
    editor.askRemoval();QTest.keyClick(window,Qt.Key_Right);QTest.keyClick(window,Qt.Key_Return)
    editor.confirmRemoval()  # repeated command while saving must be ignored
    spin(lambda:not editor.property('opened'))
    assert len(removals())==before+1 and set(removals()[-1])=={'anilist_id','removal_revision','request_id'}
    assert data(store,'entries')['154587']['presence']=='absent' and data(detail,'card')['moi'] is None

    seed();open_editor();editor.askRemoval();session.setProperty('removalFailure','conflict')
    editor.confirmRemoval();spin(lambda:editor.property('phase')=='conflict')
    old_token=removals()[-1]['removal_revision'];before=len(removals())
    editor.confirmRemoval();spin(lambda:editor.property('editable'))
    assert len(removals())==before and 'reuse_recent' not in reads()[-1]
    assert data(editor,'entry')['removal_revision']!=old_token and editor.property('removeChoice')==0
    assert window.grabWindow().save(str(evidence/'remove-rechecked.png'))
    QTest.keyClick(window,Qt.Key_Back);QTest.keyClick(window,Qt.Key_Back)

    # Lost response after applied removal: a fresh read confirms absence, without another delete.
    seed();open_editor();editor.askRemoval();session.setProperty('removalFailure','timeout')
    editor.confirmRemoval();spin(lambda:editor.property('phase')=='uncertain')
    assert window.grabWindow().save(str(evidence/'remove-uncertain.png'))
    before=len(removals());editor.confirmRemoval();spin(lambda:not editor.property('opened'))
    assert len(removals())==before and data(detail,'card')['moi'] is None and 'reuse_recent' not in reads()[-1]

    # Lost response before application: checking leaves consent open; never replay the removal.
    seed();open_editor();editor.askRemoval();session.setProperty('removalFailure','timeout_present')
    editor.confirmRemoval();spin(lambda:editor.property('phase')=='uncertain')
    before=len(removals());editor.confirmRemoval();spin(lambda:editor.property('editable'))
    assert editor.property('opened') and editor.property('removeOpen') and len(removals())==before
    assert editor.property('removeChoice')==0 and 'reuse_recent' not in reads()[-1]
    QTest.keyClick(window,Qt.Key_Back);QTest.keyClick(window,Qt.Key_Back)
    # A failed verification must not turn a later reopening into a cached read.
    seed();open_editor();editor.askRemoval();session.setProperty('removalFailure','timeout_present')
    editor.confirmRemoval();spin(lambda:editor.property('phase')=='uncertain')
    session.setProperty('failNextLibraryRead',True);editor.confirmRemoval()
    spin(lambda:editor.property('phase')=='error')
    before=len(removals());QTest.keyClick(window,Qt.Key_Back);QTest.keyClick(window,Qt.Key_Back)
    open_editor()
    assert len(removals())==before and 'reuse_recent' not in reads()[-1]
    QTest.keyClick(window,Qt.Key_Back)

    # An update response without a new removal revision cannot reuse the old consent token.
    seed();open_editor();QTest.keyClick(window,Qt.Key_Right)
    editor.save();spin(lambda:not editor.property('opened'))
    assert 'removal_revision' not in data(store,'entries')['154587']
    open_editor();before=len(reads());editor.askRemoval()
    spin(lambda:editor.property('editable'))
    assert len(reads())==before+1 and 'reuse_recent' not in reads()[-1]
    assert data(editor,'entry')['removable'] is True and editor.property('removeChoice')==0
    QTest.keyClick(window,Qt.Key_Back);QTest.keyClick(window,Qt.Key_Back)
    session.setProperty('removalUnavailable',True);seed();open_editor();editor.askRemoval()
    spin(lambda:editor.property('editable'))
    before=len(removals());before_reads=len(reads())
    assert window.findChild(QObject,'libraryRemoveConfirm').property('label')=='Vérifier mon suivi'
    editor.confirmRemoval();spin(lambda:editor.property('editable'))
    assert len(removals())==before and len(reads())==before_reads+1
    QTest.keyClick(window,Qt.Key_Back);QTest.keyClick(window,Qt.Key_Back)
    session.setProperty('removalUnavailable',False)
    detail.back()
    (evidence/'removal-verification.json').write_text(json.dumps({
        'passed':True,'scope':'real QML/fake account/API; no real removal or native playback',
        'strictCapabilityGate':True,'explicitConsent':True,'defaultCancel':True,'layeredBack':True,
        'opaqueRemovalRevisionOnly':True,'canonicalAbsencePropagated':True,'duplicateWhileSavingIgnored':True,
        'conflictFreshReadAndNewConsent':True,'lostAppliedResponseReconciledWithoutReplay':True,
        'lostUnappliedResponseNeverReplayed':True,'missingNewRevisionForcesFreshRead':True,'unconfirmedEntryCannotDelete':True,'failedVerificationReopenedFresh':True,
    },indent=2),encoding='utf-8')
