const mongoose = require('mongoose');

/**
 * Permission schema — granular access control unit (resource:action pattern).
 * Example slugs: users:read, roles:assign, appointments:create
 */
const permissionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Permission name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Permission slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    module: {
      type: String,
      required: [true, 'Module is required'],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [255, 'Description cannot exceed 255 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

permissionSchema.index({ module: 1, slug: 1 });

const Permission = mongoose.model('Permission', permissionSchema);

module.exports = Permission;
