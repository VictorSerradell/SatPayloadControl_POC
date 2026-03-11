import {
  IsEnum, IsString, IsOptional, IsNumber,
  Min, Max, MaxLength, Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CommandType, InstrumentId } from '../entities/command-log.entity';

export class SendCommandDto {
  @ApiProperty({ enum: CommandType, example: CommandType.INSTRUMENT_ON })
  @IsEnum(CommandType)
  commandType: CommandType;

  @ApiProperty({ enum: InstrumentId, example: InstrumentId.CAMERA_VIS })
  @IsEnum(InstrumentId)
  targetInstrument: InstrumentId;

  @ApiProperty({ required: false, description: 'Target mode for CHANGE_MODE command' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Matches(/^[A-Z_]+$/, { message: 'Mode must be uppercase letters and underscores only' })
  targetMode?: string;

  @ApiProperty({ required: false, description: 'Pointing angle 0-360 for POINT_SENSOR' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(360)
  pointingAngle?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  operatorNote?: string;
}
