class LabError(Exception):
    """A machine-readable failure with no provider credentials or response text."""

    def __init__(self, code, detail=None):
        super().__init__(code)
        self.code = code
        self.detail = detail
