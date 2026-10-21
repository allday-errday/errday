import AVFoundation
import PhotosUI
import SwiftUI
import UIKit

struct FoodCameraCapture: UIViewControllerRepresentable {
    @Binding var isPresented: Bool
    var isActive = true
    var onCancel: (() -> Void)?
    let onImage: (UIImage) -> Void

    func makeUIViewController(context: Context) -> FoodCameraViewController {
        let controller = FoodCameraViewController(
            onImage: { image in
                onImage(image)
                isPresented = false
            },
            onClose: {
                if let onCancel { onCancel() }
                else { isPresented = false }
            }
        )
        if isActive { controller.startCamera() }
        return controller
    }

    func updateUIViewController(_ uiViewController: FoodCameraViewController, context: Context) {
        if isActive { uiViewController.startCamera() }
        else { uiViewController.stopCamera() }
    }
}

final class FoodCameraViewController: UIViewController, AVCapturePhotoCaptureDelegate, PHPickerViewControllerDelegate {
    private let session = AVCaptureSession()
    private let photoOutput = AVCapturePhotoOutput()
    private let sessionQueue = DispatchQueue(label: "com.errday.food-camera")
    private let onImage: (UIImage) -> Void
    private let onClose: () -> Void
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private var camera: AVCaptureDevice?
    private var torchEnabled = false
    private var isConfigured = false

    private lazy var closeButton = cameraButton(symbol: "xmark", action: #selector(close))
    private lazy var torchButton = cameraButton(symbol: "flashlight.off.fill", action: #selector(toggleTorch))
    private lazy var libraryButton = cameraButton(symbol: "photo.on.rectangle", action: #selector(openLibrary))
    private lazy var captureButton: UIButton = {
        let button = UIButton(type: .custom)
        button.translatesAutoresizingMaskIntoConstraints = false
        button.accessibilityLabel = "Take photo"
        button.addTarget(self, action: #selector(capture), for: .touchUpInside)
        button.layer.borderColor = UIColor.white.cgColor
        button.layer.borderWidth = 5
        button.layer.cornerRadius = 36
        button.clipsToBounds = true
        button.backgroundColor = UIColor.white.withAlphaComponent(0.24)
        return button
    }()

    private lazy var instructionLabel: UILabel = {
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.text = "Keep the full label sharp and inside the frame"
        label.textColor = .white
        label.font = .systemFont(ofSize: 15, weight: .semibold)
        label.textAlignment = .center
        label.numberOfLines = 2
        return label
    }()

    private lazy var focusFrame: UIView = {
        let view = UIView()
        view.translatesAutoresizingMaskIntoConstraints = false
        view.layer.borderColor = UIColor.white.withAlphaComponent(0.86).cgColor
        view.layer.borderWidth = 1.5
        view.layer.cornerRadius = 16
        view.isUserInteractionEnabled = false
        return view
    }()

    init(onImage: @escaping (UIImage) -> Void, onClose: @escaping () -> Void) {
        self.onImage = onImage
        self.onClose = onClose
        super.init(nibName: nil, bundle: nil)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        configurePreview()
        configureControls()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        previewLayer?.frame = view.bounds
    }

    func startCamera() {
        if !isConfigured { configureSession() }
        guard isConfigured else { return }
        sessionQueue.async { [weak self] in
            guard let self, !self.session.isRunning else { return }
            self.session.startRunning()
        }
    }

    func stopCamera() {
        setTorch(false)
        sessionQueue.async { [weak self] in
            guard let self, self.session.isRunning else { return }
            self.session.stopRunning()
        }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        stopCamera()
    }

    private func configurePreview() {
        let layer = AVCaptureVideoPreviewLayer(session: session)
        layer.videoGravity = .resizeAspectFill
        view.layer.addSublayer(layer)
        previewLayer = layer
    }

    private func configureControls() {
        let shade = UIView()
        shade.translatesAutoresizingMaskIntoConstraints = false
        shade.backgroundColor = UIColor.black.withAlphaComponent(0.35)

        view.addSubview(shade)
        view.addSubview(closeButton)
        view.addSubview(focusFrame)
        view.addSubview(instructionLabel)
        view.addSubview(torchButton)
        view.addSubview(captureButton)
        view.addSubview(libraryButton)
        torchButton.accessibilityLabel = "Turn flashlight on"
        libraryButton.accessibilityLabel = "Choose from photo library"

        NSLayoutConstraint.activate([
            shade.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            shade.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            shade.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            shade.heightAnchor.constraint(equalToConstant: 142),

            closeButton.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 18),
            closeButton.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 12),
            closeButton.widthAnchor.constraint(equalToConstant: 48),
            closeButton.heightAnchor.constraint(equalToConstant: 48),

            focusFrame.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 28),
            focusFrame.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -28),
            focusFrame.centerYAnchor.constraint(equalTo: view.centerYAnchor, constant: -28),
            focusFrame.heightAnchor.constraint(equalTo: focusFrame.widthAnchor, multiplier: 0.92),

            instructionLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 42),
            instructionLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -42),
            instructionLabel.bottomAnchor.constraint(equalTo: shade.topAnchor, constant: -18),

            captureButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            captureButton.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -18),
            captureButton.widthAnchor.constraint(equalToConstant: 72),
            captureButton.heightAnchor.constraint(equalToConstant: 72),

            torchButton.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 28),
            torchButton.centerYAnchor.constraint(equalTo: captureButton.centerYAnchor),
            torchButton.widthAnchor.constraint(equalToConstant: 52),
            torchButton.heightAnchor.constraint(equalToConstant: 52),

            libraryButton.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -28),
            libraryButton.centerYAnchor.constraint(equalTo: captureButton.centerYAnchor),
            libraryButton.widthAnchor.constraint(equalToConstant: 52),
            libraryButton.heightAnchor.constraint(equalToConstant: 52)
        ])
    }

    private func configureSession() {
        session.beginConfiguration()
        session.sessionPreset = .photo
        defer { session.commitConfiguration() }

        guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
              let input = try? AVCaptureDeviceInput(device: camera),
              session.canAddInput(input),
              session.canAddOutput(photoOutput) else { return }
        self.camera = camera
        session.addInput(input)
        session.addOutput(photoOutput)
        isConfigured = true
    }

    private func cameraButton(symbol: String, action: Selector) -> UIButton {
        let button = UIButton(type: .system)
        button.translatesAutoresizingMaskIntoConstraints = false
        button.setImage(UIImage(systemName: symbol), for: .normal)
        button.setPreferredSymbolConfiguration(.init(pointSize: 19, weight: .semibold), forImageIn: .normal)
        button.tintColor = .white
        button.backgroundColor = UIColor.black.withAlphaComponent(0.44)
        button.layer.cornerRadius = 26
        button.clipsToBounds = true
        button.addTarget(self, action: action, for: .touchUpInside)
        return button
    }

    @objc private func close() { onClose() }

    @objc private func capture() {
        let settings = AVCapturePhotoSettings()
        photoOutput.capturePhoto(with: settings, delegate: self)
    }

    @objc private func toggleTorch() {
        setTorch(!torchEnabled)
    }

    private func setTorch(_ enabled: Bool) {
        guard let camera, camera.hasTorch else {
            torchButton.isEnabled = false
            return
        }
        do {
            try camera.lockForConfiguration()
            camera.torchMode = enabled ? .on : .off
            camera.unlockForConfiguration()
            torchEnabled = enabled
            torchButton.setImage(UIImage(systemName: enabled ? "flashlight.on.fill" : "flashlight.off.fill"), for: .normal)
            torchButton.accessibilityLabel = enabled ? "Turn flashlight off" : "Turn flashlight on"
        } catch {
            torchButton.isEnabled = false
        }
    }

    @objc private func openLibrary() {
        var configuration = PHPickerConfiguration(photoLibrary: .shared())
        configuration.filter = .images
        configuration.selectionLimit = 1
        let picker = PHPickerViewController(configuration: configuration)
        picker.delegate = self
        present(picker, animated: true)
    }

    func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        guard error == nil, let data = photo.fileDataRepresentation(), let image = UIImage(data: data) else { return }
        onImage(image)
    }

    func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
        guard let provider = results.first?.itemProvider, provider.canLoadObject(ofClass: UIImage.self) else {
            picker.dismiss(animated: true)
            return
        }
        provider.loadObject(ofClass: UIImage.self) { [weak self, weak picker] object, _ in
            guard let image = object as? UIImage else { return }
            DispatchQueue.main.async {
                picker?.dismiss(animated: false)
                self?.onImage(image)
            }
        }
    }
}
