exports.isNotEmpty = (data) => {
    expect(data).not.toBeNull()
    expect(data).not.toBeUndefined()
}