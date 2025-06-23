// services/notificationService.js
import { Notification } from "../models/Notifications.model.js";
import { User } from "../models/User.model.js";

class NotificationService {
  /**
   * Create a notification for a specific user
   */
  async createNotification({ recipient, sender = null, title, message, type }) {
    try {
      const notification = new Notification({
        recipient,
        sender,
        title,
        message,
        type,
      });

      await notification.save();
      return notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  /**
   * Create notifications for all admin users
   */
  async notifyAllAdmins({ sender = null, title, message, type }) {
    try {
      const admins = await User.find({ role: "admin" });
      
      const notifications = admins.map(admin => ({
        recipient: admin._id,
        sender,
        title,
        message,
        type,
      }));

      await Notification.insertMany(notifications);
      return notifications;
    } catch (error) {
      console.error("Error notifying admins:", error);
      throw error;
    }
  }

  /**
   * Create notifications for all users in a department
   */
  async notifyDepartmentUsers({ departmentId, sender = null, title, message, type }) {
    try {
      const departmentUsers = await User.find({ department: departmentId });
      
      const notifications = departmentUsers.map(user => ({
        recipient: user._id,
        sender,
        title,
        message,
        type,
      }));

      await Notification.insertMany(notifications);
      return notifications;
    } catch (error) {
      console.error("Error notifying department users:", error);
      throw error;
    }
  }

  /**
   * Create notifications for all users
   */
  async notifyAllUsers({ sender = null, title, message, type }) {
    try {
      const users = await User.find({});
      
      const notifications = users.map(user => ({
        recipient: user._id,
        sender,
        title,
        message,
        type,
      }));

      await Notification.insertMany(notifications);
      return notifications;
    } catch (error) {
      console.error("Error notifying all users:", error);
      throw error;
    }
  }

  /**
   * Notify about department creation
   */
  async notifyDepartmentCreated({ departmentName, createdBy }) {
    try {
      await this.notifyAllAdmins({
        sender: createdBy,
        title: "New Department Created",
        message: `A new department "${departmentName}" has been created.`,
        type: "system",
      });
    } catch (error) {
      console.error("Error notifying department creation:", error);
      throw error;
    }
  }

  /**
   * Notify about department deletion
   */
  async notifyDepartmentDeleted({ departmentName, deletedBy }) {
    try {
      await this.notifyAllUsers({
        sender: deletedBy,
        title: "Department Deleted",
        message: `The department "${departmentName}" has been deleted. Affected employees have been notified.`,
        type: "system",
      });
    } catch (error) {
      console.error("Error notifying department deletion:", error);
      throw error;
    }
  }

  /**
   * Notify about employee creation
   */
  async notifyEmployeeCreated({ employeeName, departmentName, createdBy }) {
    try {
      await this.notifyAllAdmins({
        sender: createdBy,
        title: "New Employee Registered",
        message: `${employeeName} has been registered in the ${departmentName} department.`,
        type: "system",
      });
    } catch (error) {
      console.error("Error notifying employee creation:", error);
      throw error;
    }
  }

  /**
   * Notify about employee deletion
   */
  async notifyEmployeeDeleted({ employeeName, departmentName, deletedBy }) {
    try {
      await this.notifyAllAdmins({
        sender: deletedBy,
        title: "Employee Removed",
        message: `${employeeName} from the ${departmentName} department has been removed from the system.`,
        type: "system",
      });
    } catch (error) {
      console.error("Error notifying employee deletion:", error);
      throw error;
    }
  }

  /**
   * Notify about attendance marking
   */
  async notifyAttendanceMarked({ employeeId, employeeName, status, date }) {
    try {
      // Get the employee's department and manager/admin info
      const employee = await User.findById(employeeId).populate('department');
      
      if (employee && employee.department) {
        // Notify department admins about attendance
        await this.notifyAllAdmins({
          sender: employeeId,
          title: "Attendance Marked",
          message: `${employeeName} from ${employee.department.name} department marked attendance as ${status} for ${date.toDateString()}.`,
          type: "attendance",
        });
      }

      // Optionally, notify the employee themselves (confirmation)
      await this.createNotification({
        recipient: employeeId,
        sender: null, // System notification
        title: "Attendance Confirmed",
        message: `Your attendance has been marked as ${status} for ${date.toDateString()}.`,
        type: "attendance",
      });
    } catch (error) {
      console.error("Error notifying attendance:", error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();