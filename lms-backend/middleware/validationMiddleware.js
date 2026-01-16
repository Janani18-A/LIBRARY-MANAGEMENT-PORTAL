const validateAdminLogin = (req, res, next) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username and password are required'
            });
        }

        const trimmedUsername = username.trim();
        const trimmedPassword = password.trim();

        if (trimmedUsername.length === 0 || trimmedPassword.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Username and password cannot be empty'
            });
        }

        req.sanitizedData = {
            username: trimmedUsername,
            password: trimmedPassword
        };

        next();
        
    } catch (error) {
        console.error('🔴 Validation middleware error:', error);
        res.status(500).json({
            success: false,
            error: 'Validation system error'
        });
    }
};



//student signup
const validateStudentSignup = (req, res, next) => {
  try {
    const { reg_no, name, department, year } = req.body;

    if (!reg_no || !name || !department || !year) {
      return res.status(400).json({
        success: false,
        error: "All fields are required"
      });
    }

    req.sanitizedData = {
      reg_no: reg_no.trim(),
      name: name.trim(),
      department: department.trim(),
      year: parseInt(year)
    };

    next();
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Signup validation error"
    });
  }
};

//Student Login

const validateStudentLogin = (req, res, next) => {
  try {
    const { reg_no, name } = req.body;

    if (!reg_no || !name) {
      return res.status(400).json({
        success: false,
        error: "Register No and Name are required"
      });
    }

    const cleanRegNo = reg_no.trim();
    const cleanName = name.trim();

    if (!cleanRegNo || !cleanName) {
      return res.status(400).json({
        success: false,
        error: "Register No and Name cannot be empty"
      });
    }

    req.sanitizedData = {
      reg_no: cleanRegNo,
      name: cleanName
    };

    next();
  } catch (err) {
    console.error("🔴 Student validation error:", err);
    res.status(500).json({
      success: false,
      error: "Validation system error"
    });
  }
};


module.exports = {
    validateAdminLogin,
      validateStudentLogin,
  validateStudentSignup
};

