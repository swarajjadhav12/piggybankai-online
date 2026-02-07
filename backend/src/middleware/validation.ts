import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validateBody =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      return next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        details: error instanceof Error ? error.message : error,
      });
    }
  };

export const validateQuery =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      return next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error instanceof Error ? error.message : error,
      });
    }
  };

export const validateParams =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params);
      return next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid route parameters',
        details: error instanceof Error ? error.message : error,
      });
    }
  };

export const validateHeaders =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      req.headers = schema.parse(req.headers);
      return next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid headers',
        details: error instanceof Error ? error.message : error,
      });
    }
  };
