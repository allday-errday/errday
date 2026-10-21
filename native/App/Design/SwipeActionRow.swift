import SwiftUI

struct SwipeActionRow<Content: View>: View {
    let onEdit: () -> Void
    let onDelete: () -> Void
    @ViewBuilder let content: Content
    @State private var offset: CGFloat = 0

    init(onEdit: @escaping () -> Void, onDelete: @escaping () -> Void,
         @ViewBuilder content: () -> Content) {
        self.onEdit = onEdit
        self.onDelete = onDelete
        self.content = content()
    }

    var body: some View {
        ZStack(alignment: .trailing) {
            HStack(spacing: 0) {
                Spacer()
                action("Edit", icon: "pencil", color: ErrdayTheme.accent, action: onEdit)
                action("Delete", icon: "trash", color: .red, action: onDelete)
            }
            content
                .background(ErrdayTheme.surface, in: RoundedRectangle(cornerRadius: ErrdayTheme.radius))
                .offset(x: offset)
                .contentShape(Rectangle())
                .simultaneousGesture(DragGesture(minimumDistance: 18)
                    .onChanged { value in
                        guard abs(value.translation.width) > abs(value.translation.height) else { return }
                        offset = min(0, max(-152, value.translation.width))
                    }
                    .onEnded { value in
                        withAnimation(.snappy) { offset = value.translation.width < -45 ? -152 : 0 }
                    })
                .onTapGesture { if offset != 0 { withAnimation(.snappy) { offset = 0 } } }
        }
        .clipShape(RoundedRectangle(cornerRadius: ErrdayTheme.radius))
        .accessibilityAction(named: "Edit", onEdit)
        .accessibilityAction(named: "Delete", onDelete)
    }

    private func action(_ title: String, icon: String, color: Color, action: @escaping () -> Void) -> some View {
        Button {
            withAnimation(.snappy) { offset = 0 }
            action()
        } label: {
            VStack(spacing: 5) {
                Image(systemName: icon)
                Text(title).font(.caption2)
            }.frame(width: 76).frame(maxHeight: .infinity).foregroundStyle(.white).background(color)
        }.buttonStyle(.plain)
    }
}

struct DeleteSwipeRow<Content: View>: View {
    let allowsRowTap: Bool
    let onTap: () -> Void
    let onDelete: () -> Void
    @ViewBuilder let content: Content
    @State private var isOpen = false
    @GestureState private var dragOffset: CGFloat = 0

    private let actionWidth: CGFloat = 82

    init(allowsRowTap: Bool = true, onTap: @escaping () -> Void, onDelete: @escaping () -> Void,
         @ViewBuilder content: () -> Content) {
        self.allowsRowTap = allowsRowTap
        self.onTap = onTap; self.onDelete = onDelete; self.content = content()
    }

    var body: some View {
        rowContent
            .background(ErrdayTheme.surface, in: RoundedRectangle(cornerRadius: ErrdayTheme.radius))
            .offset(x: visibleOffset)
            .contentShape(Rectangle())
            .allowsHitTesting(!isOpen)
            .simultaneousGesture(DragGesture(minimumDistance: 18)
                .updating($dragOffset) { value, state, _ in
                    guard abs(value.translation.width) > abs(value.translation.height) else { return }
                    state = value.translation.width
                }
                .onEnded { value in
                    guard abs(value.translation.width) > abs(value.translation.height) else { return }
                    withAnimation(.snappy) {
                        isOpen = value.predictedEndTranslation.width < -actionWidth / 2
                    }
                })
            .background {
                if isActionVisible {
                    GeometryReader { geometry in
                        ZStack(alignment: .trailing) {
                            if isOpen {
                                Button { close() } label: {
                                    Color.clear.contentShape(Rectangle())
                                }
                                .buttonStyle(.plain)
                            }
                            Button {
                                onDelete()
                                close()
                            } label: {
                                VStack(spacing: 5) {
                                    Image(systemName: "trash")
                                    Text("Delete").font(.caption2)
                                }
                                .frame(width: actionWidth, height: geometry.size.height)
                                .foregroundStyle(.white)
                                .background(.red)
                            }
                            .buttonStyle(.plain)
                        }
                        .frame(width: geometry.size.width, height: geometry.size.height)
                    }
                }
            }
        .clipShape(RoundedRectangle(cornerRadius: ErrdayTheme.radius))
        .accessibilityAction(named: "Delete", onDelete)
    }

    @ViewBuilder private var rowContent: some View {
        if allowsRowTap {
            content.onTapGesture(perform: onTap)
        } else {
            content
        }
    }

    private var visibleOffset: CGFloat {
        min(0, max(-actionWidth, (isOpen ? -actionWidth : 0) + dragOffset))
    }

    private var isActionVisible: Bool {
        isOpen || dragOffset < -0.5
    }

    private func close() {
        withAnimation(.snappy) { isOpen = false }
    }
}
