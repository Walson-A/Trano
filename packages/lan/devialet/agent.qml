import QtQuick 2.4
import fbx.application 1.0
import "."

// Minimal SDK host. A future Atlas TV shell can embed the same invisible component.
Application {
    RelayAgent {
        config: __TRANO_AGENT_CONFIG__
        onDiagnosticFinished: Qt.quit()
    }
}
