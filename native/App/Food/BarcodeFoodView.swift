import AVFoundation
import ErrdayCore
import SwiftUI
import VisionKit

struct BarcodeFoodView: View {
    @Environment(\.dismiss) private var dismiss
    var slot: MealSlot = .suggested(at: .now)
    var date: Date = .now

    @State private var scanning = false
    @State private var torchEnabled = false
    @State private var error: String?
    @State private var code = ""
    @State private var destination: BarcodeDestination?

    private enum BarcodeDestination: String, Identifiable {
        case manual, search
        var id: String { rawValue }
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if scanning {
                BarcodeCamera(
                    torchEnabled: $torchEnabled,
                    onCode: showSearch,
                    onError: { message in error = message; scanning = false }
                )
                .ignoresSafeArea()
                scannerOverlay
            } else {
                unavailableView
            }
        }
        .task { await openCamera() }
        .onDisappear { torchEnabled = false }
        .sheet(item: $destination, onDismiss: {
            Task { await openCamera() }
        }) { destination in
            switch destination {
            case .manual:
                ManualBarcodeEntry(code: $code) { showSearch($0) }
                    .presentationDetents([.height(310)])
                    .presentationDragIndicator(.visible)
            case .search:
                FoodSearchView(query: code, date: date, slot: slot)
            }
        }
    }

    private var scannerOverlay: some View {
        VStack(spacing: 0) {
            HStack {
                cameraButton(symbol: "xmark", label: "Close") { dismiss() }
                Spacer()
            }
            .padding(.horizontal, 18)
            .padding(.top, 12)

            Spacer()

            VStack(spacing: 14) {
                RoundedRectangle(cornerRadius: 18)
                    .stroke(.white.opacity(0.9), lineWidth: 2)
                    .frame(maxWidth: 360)
                    .frame(height: 220)
                    .overlay {
                        Image(systemName: "barcode.viewfinder")
                            .font(.system(size: 48, weight: .light))
                            .foregroundStyle(.white.opacity(0.78))
                    }
                Text("Hold the barcode inside the frame")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(.white)
            }
            .padding(.horizontal, 24)

            Spacer()

            HStack(spacing: 12) {
                cameraButton(
                    symbol: torchEnabled ? "flashlight.on.fill" : "flashlight.off.fill",
                    label: torchEnabled ? "Turn flashlight off" : "Turn flashlight on"
                ) { torchEnabled.toggle() }

                Button {
                    scanning = false
                    torchEnabled = false
                    destination = .manual
                } label: {
                    Label("Enter barcode manually", systemImage: "keyboard")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity, minHeight: 54)
                        .background(.black.opacity(0.48), in: RoundedRectangle(cornerRadius: 14))
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 22)
            .padding(.bottom, 18)
        }
    }

    private var unavailableView: some View {
        VStack(spacing: 18) {
            HStack {
                cameraButton(symbol: "xmark", label: "Close") { dismiss() }
                Spacer()
            }
            Spacer()
            Image(systemName: "barcode.viewfinder")
                .font(.system(size: 54, weight: .light))
                .foregroundStyle(.white)
            Text(error ?? "Starting camera…")
                .font(.system(size: 16, weight: .medium))
                .multilineTextAlignment(.center)
                .foregroundStyle(.white.opacity(0.82))
                .padding(.horizontal, 34)
            Spacer()
            Button { destination = .manual } label: {
                Label("Enter barcode manually", systemImage: "keyboard")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity, minHeight: 54)
                    .errdayGlass(radius: 27, interactive: true)
                    .environment(\.colorScheme, .dark)
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 22)
            .padding(.bottom, 18)
        }
        .padding(.top, 12)
    }

    private func cameraButton(symbol: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 19, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 52, height: 52)
                .errdayGlassCircle(interactive: true)
                .environment(\.colorScheme, .dark)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }

    private func showSearch(_ scannedCode: String) {
        let cleaned = scannedCode.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleaned.isEmpty else { return }
        code = cleaned
        scanning = false
        torchEnabled = false
        destination = .search
    }

    private func openCamera() async {
        guard DataScannerViewController.isSupported else {
            error = "Camera scanning is unavailable on this device."
            return
        }
        let allowed = await AVCaptureDevice.requestAccess(for: .video)
        guard allowed else {
            error = "Camera access is off. Allow it in iPhone Settings or enter the barcode manually."
            return
        }
        guard DataScannerViewController.isAvailable else {
            error = "The camera is currently unavailable."
            return
        }
        error = nil
        scanning = true
    }
}

private struct ManualBarcodeEntry: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var code: String
    let search: (String) -> Void
    @FocusState private var focused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("Enter barcode")
                .font(.system(size: 22, weight: .semibold))
            TextField("Barcode number", text: $code)
                .keyboardType(.numberPad)
                .textContentType(.none)
                .font(.system(size: 18))
                .padding(.horizontal, 14)
                .frame(height: 54)
                .background(ErrdayTheme.raised, in: RoundedRectangle(cornerRadius: 12))
                .focused($focused)
                .toolbar {
                    ToolbarItemGroup(placement: .keyboard) {
                        Spacer()
                        Button("Done") { focused = false }
                    }
                }
            Button("Search Product") {
                let value = code
                dismiss()
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { search(value) }
            }
            .buttonStyle(PrimaryButtonStyle())
            .disabled(code.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        }
        .padding(22)
        .onAppear { focused = true }
    }
}

private struct BarcodeCamera: UIViewControllerRepresentable {
    @Binding var torchEnabled: Bool
    let onCode: (String) -> Void
    let onError: (String) -> Void

    func makeCoordinator() -> Coordinator { Coordinator(parent: self) }

    func makeUIViewController(context: Context) -> DataScannerViewController {
        let controller = DataScannerViewController(
            recognizedDataTypes: [.barcode(symbologies: [.ean13, .ean8, .upce, .code128])],
            qualityLevel: .balanced,
            recognizesMultipleItems: false,
            isGuidanceEnabled: false,
            isHighlightingEnabled: true
        )
        controller.delegate = context.coordinator
        do { try controller.startScanning() }
        catch { DispatchQueue.main.async { onError("The camera could not start. Please try again.") } }
        return controller
    }

    func updateUIViewController(_ uiViewController: DataScannerViewController, context: Context) {
        context.coordinator.parent = self
        context.coordinator.setTorchIfNeeded(torchEnabled)
    }

    static func dismantleUIViewController(_ uiViewController: DataScannerViewController, coordinator: Coordinator) {
        uiViewController.stopScanning()
        coordinator.setTorchIfNeeded(false)
    }

    private static func setTorch(_ enabled: Bool) {
        guard let device = AVCaptureDevice.default(for: .video), device.hasTorch else { return }
        do {
            try device.lockForConfiguration()
            device.torchMode = enabled ? .on : .off
            device.unlockForConfiguration()
        } catch {}
    }

    private func setTorch(_ enabled: Bool) { Self.setTorch(enabled) }

    final class Coordinator: NSObject, DataScannerViewControllerDelegate {
        var parent: BarcodeCamera
        private var handled = false
        private var appliedTorchState = false

        init(parent: BarcodeCamera) { self.parent = parent }

        func setTorchIfNeeded(_ enabled: Bool) {
            guard enabled != appliedTorchState else { return }
            appliedTorchState = enabled
            BarcodeCamera.setTorch(enabled)
        }

        func dataScanner(_ dataScanner: DataScannerViewController, didAdd addedItems: [RecognizedItem], allItems: [RecognizedItem]) {
            guard !handled else { return }
            for item in addedItems {
                guard case .barcode(let barcode) = item, let code = barcode.payloadStringValue else { continue }
                handled = true
                dataScanner.stopScanning()
                parent.onCode(code)
                return
            }
        }

        func dataScanner(_ dataScanner: DataScannerViewController, becameUnavailableWithError error: DataScannerViewController.ScanningUnavailable) {
            parent.onError("Camera scanning was interrupted.")
        }
    }
}
